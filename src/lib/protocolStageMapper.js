/**
 * protocolStageMapper.js — Protocol Stage ↔ Packet mapping utilities
 *
 * Maps individual packets to their protocol stages using:
 * 1. packetRefs from timeline stage definitions (exact match)
 * 2. TCP flag inference for TCP handshake/teardown
 * 3. Direction-based inference for HTTP(S) — Client→Server = Request, Server→Client = Response
 */

import { PROTOCOL_STATES } from './ProtocolStates'

/**
 * Build a reverse lookup map: packetIndex → StageInfo
 */
export function buildPacketStageMap(connections) {
  const map = new Map()

  for (const conn of connections) {
    if (!conn?.stages || !Array.isArray(conn.stages)) continue
    const protocolType = conn.protocolType || 'unknown'
    const totalStages = conn.stages.length
    const protocolDef = PROTOCOL_STATES[protocolType]

    conn.stages.forEach((stage, stageIndex) => {
      const color = protocolDef?.stages?.[stageIndex]?.color || '#706b61'
      if (!stage.packetRefs || !Array.isArray(stage.packetRefs)) return

      for (const packetIndex of stage.packetRefs) {
        if (packetIndex == null) continue
        if (!map.has(packetIndex)) {
          map.set(packetIndex, {
            stageKey: stage.key || stage.step || `stage-${stageIndex}`,
            stageLabel: stage.label || `Stage ${stageIndex + 1}`,
            stageIndex,
            totalStages,
            protocolType,
            color,
            connectionId: conn.originalId || conn.id || '',
          })
        }
      }
    })
  }

  return map
}

/**
 * Infer stage by TCP flags (for handshake/teardown protocols).
 */
function inferStageByFlags(packet, protocolType) {
  const flags = packet.headers?.tcp?.flags || ''
  const flagUpper = flags.toUpperCase()

  if (protocolType === 'tcp-handshake') {
    if (flagUpper === 'SYN') return 0
    if (flagUpper === 'SYN|ACK' || flagUpper === 'ACK|SYN') return 1
    if (flagUpper === 'ACK') return 2
  }

  if (protocolType === 'tcp-teardown') {
    if (flagUpper.includes('FIN') && flagUpper.includes('ACK')) return 0
    if (flagUpper === 'ACK') return 1
    if (flagUpper.includes('FIN')) return 2
    if (flagUpper.includes('RST')) return 3
  }

  return null
}

/**
 * Direction-based stage assignment for HTTP(S) protocols.
 *
 * Rules:
 * - Client→Server with PSH: Request
 * - Server→Client with PSH: Response
 * - Pure ACK: belongs to the preceding direction's stage
 * - Multiple transactions detected by time gaps → each gets its own Request/Response cycle
 *
 * @param {Array} orphans - Unmatched packets
 * @param {Array} groups - Stage groups (request / processing / response)
 * @param {string} clientIp - The client IP (source IP of the connection)
 * @param {number} clientPort - The client port
 */
function assignByDirection(orphans, groups, clientIp, clientPort) {
  if (orphans.length === 0 || groups.length < 2) return orphans

  // Find stage indices for request and response
  const requestIdx = groups.findIndex(g => g.stageKey === 'request')
  const responseIdx = groups.findIndex(g => g.stageKey === 'response')

  if (requestIdx === -1 || responseIdx === -1) return orphans

  const remaining = []
  let lastDirectionStage = requestIdx // track last non-ACK direction

  for (const packet of orphans) {
    const srcIp = packet.fiveTuple?.srcIp
    const srcPort = packet.fiveTuple?.srcPort
    const flags = (packet.headers?.tcp?.flags || '').toUpperCase()
    const hasPSH = flags.includes('PSH')
    const isPureACK = flags === 'ACK'
    const isFromClient = srcIp === clientIp && srcPort === clientPort

    if (hasPSH || flags.includes('SYN') || flags.includes('FIN')) {
      // Data packet — direction determines stage
      if (isFromClient) {
        // Client→Server: Request
        groups[requestIdx].packets.push(packet)
        groups[requestIdx].missing = false
        lastDirectionStage = requestIdx
      } else {
        // Server→Client: Response
        groups[responseIdx].packets.push(packet)
        groups[responseIdx].missing = false
        lastDirectionStage = responseIdx
      }
    } else if (isPureACK) {
      // Pure ACK: follows the direction of the packet it acknowledges
      // ACK from client after server data → belongs to response stage
      // ACK from server after client data → belongs to request stage
      if (isFromClient) {
        // Client sends ACK → acknowledging server's data → response stage
        groups[responseIdx].packets.push(packet)
        groups[responseIdx].missing = false
      } else {
        // Server sends ACK → acknowledging client's data → request stage
        groups[requestIdx].packets.push(packet)
        groups[requestIdx].missing = false
      }
    } else {
      // Other flags — use last direction context
      if (lastDirectionStage < groups.length) {
        groups[lastDirectionStage].packets.push(packet)
        groups[lastDirectionStage].missing = false
      } else {
        remaining.push(packet)
      }
    }
  }

  // Sort packets within each group by index (chronological order)
  groups[requestIdx].packets.sort((a, b) => a.index - b.index)
  groups[responseIdx].packets.sort((a, b) => a.index - b.index)

  return remaining
}

/**
 * Group a flat packet array by protocol stages.
 *
 * Strategy:
 * 1. Match by packetRefs (exact index match)
 * 2. For unmatched TCP handshake/teardown: flag inference
 * 3. For unmatched HTTP(S): direction-based assignment (Client→Server = Request, Server→Client = Response)
 * 4. For timeout: positional assignment
 *
 * @param {Array} packets - Flat array of packet objects (each with .index)
 * @param {Map} stageMap - From buildPacketStageMap()
 * @param {string} protocolType - e.g. "tcp-handshake"
 * @param {Array} backendStages - The actual stages from connection.stages
 * @param {Object} connectionMeta - { clientIp, clientPort } for direction-based grouping
 * @returns {Object} Grouped result
 */
export function groupPacketsByStage(packets, stageMap, protocolType, backendStages, connectionMeta) {
  const protocolDef = PROTOCOL_STATES[protocolType]
  const stages = backendStages || []

  if (stages.length === 0) {
    return {
      groups: [],
      orphanPackets: packets,
      completedStages: 0,
      totalStages: 0,
      protocolType,
      description: protocolDef?.description || protocolType || '',
    }
  }

  // Build groups from BACKEND timeline stages
  const groups = stages.map((stage, idx) => {
    const animColor = protocolDef?.stages?.[idx]?.color
    return {
      stageKey: stage.key || stage.step || `stage-${idx}`,
      stageLabel: stage.label || `Stage ${idx + 1}`,
      stageIndex: idx,
      color: animColor || '#706b61',
      direction: stage.direction || protocolDef?.stages?.[idx]?.direction || 'forward',
      icon: protocolDef?.stages?.[idx]?.icon || '',
      packets: [],
      missing: true,
    }
  })

  let orphanPackets = []

  // Pass 1: Match by packetRefs (exact index)
  for (const packet of packets) {
    const stageInfo = stageMap.get(packet.index)
    if (stageInfo && stageInfo.stageIndex < groups.length) {
      groups[stageInfo.stageIndex].packets.push(packet)
      groups[stageInfo.stageIndex].missing = false
    } else {
      orphanPackets.push(packet)
    }
  }

  // Pass 2: Protocol-specific inference for orphans
  if (orphanPackets.length > 0) {
    if (protocolType === 'tcp-handshake' || protocolType === 'tcp-teardown') {
      // TCP flag inference
      const stillOrphan = []
      for (const packet of orphanPackets) {
        const inferred = inferStageByFlags(packet, protocolType)
        if (inferred !== null && inferred < groups.length) {
          groups[inferred].packets.push(packet)
          groups[inferred].missing = false
        } else {
          stillOrphan.push(packet)
        }
      }
      orphanPackets = stillOrphan
    } else if (protocolType === 'https-request' || protocolType === 'http-request') {
      // Direction-based assignment
      const clientIp = connectionMeta?.clientIp
      const clientPort = connectionMeta?.clientPort
      if (clientIp) {
        orphanPackets = assignByDirection(orphanPackets, groups, clientIp, clientPort)
      }
    } else if (protocolType === 'timeout') {
      // Timeout: first half → waiting, second half → timeout
      const mid = Math.floor(orphanPackets.length / 2)
      for (let i = 0; i < orphanPackets.length; i++) {
        const stageIdx = i < mid ? 0 : Math.min(1, groups.length - 1)
        groups[stageIdx].packets.push(orphanPackets[i])
        groups[stageIdx].missing = false
      }
      orphanPackets = []
    }
  }

  const completedStages = groups.filter(g => !g.missing).length

  return {
    groups,
    orphanPackets,
    completedStages,
    totalStages: groups.length,
    protocolType,
    description: protocolDef?.description || protocolType || '',
  }
}
