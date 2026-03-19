/**
 * graphLayout.js
 *
 * Pure helper functions for graph topology analysis used by the MindMap layout engine.
 * Extracted from MindMap.jsx for testability.
 */

/**
 * Parses a timeline object to extract source and destination IP/port information.
 *
 * Timeline ID format:
 *   1. "tcp-teardown-10.128.0.2-5416-10.0.0.2-80"  (with sub-type)
 *   2. "tcp-10.128.0.2-5416-10.0.0.2-80"            (plain protocol)
 *
 * @param {object|null} timeline - Timeline object with an `id` string property.
 * @returns {{ protocol: string, protocolType: string, src: {ip: string, port: string}, dst: {ip: string, port: string} } | null}
 */
export function parseTimelineId(timeline) {
  if (!timeline?.id) {
    return null
  }

  // Timeline ID 格式：
  // IPv4: "tcp-teardown-10.128.0.2-5416-10.0.0.2-80"
  // IPv6: "tcp-[2001:db8::1]-5416-[2001:db8::2]-80"
  const IP_PART = '(?:\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}|\\[[0-9a-fA-F:]+\\])'
  const ipPortPattern = new RegExp(`(${IP_PART})-(\\d+)-(${IP_PART})-(\\d+)$`)
  const match = timeline.id.match(ipPortPattern)

  if (!match) {
    return null
  }

  const srcIp = match[1].replace(/^\[|\]$/g, '')
  const srcPort = match[2]
  const dstIp = match[3].replace(/^\[|\]$/g, '')
  const dstPort = match[4]

  // 提取協議類型（IP 之前的部分）
  const protocolPart = timeline.id.replace(ipPortPattern, '').replace(/-$/, '')

  return {
    protocol: protocolPart,
    protocolType: timeline.protocolType || protocolPart,
    src: { ip: srcIp, port: srcPort },
    dst: { ip: dstIp, port: dstPort }
  }
}

/**
 * Builds adjacency list and BFS depth/parent maps from an array of timeline objects.
 *
 * Algorithm:
 *   1. Parse each timeline to extract src/dst IP pairs.
 *   2. Build an undirected adjacency list and count connections per IP.
 *   3. Identify the center node as the IP with the highest connection count.
 *   4. BFS from center to assign depth and parentIp to every reachable node.
 *
 * @param {Array<object>} timelines - Array of timeline objects (each has an `id` string).
 * @returns {{
 *   centerIp: string|null,
 *   depthMap: Map<string, number>,
 *   parentMap: Map<string, string>,
 *   connectionCounts: Map<string, number>,
 *   adjacency: Map<string, Set<string>>
 * }}
 */
export function buildAdjacencyAndDepth(timelines) {
  const adjacency = new Map()
  const connectionCounts = new Map()

  timelines.forEach((timeline) => {
    const parsed = parseTimelineId(timeline)
    if (!parsed?.src?.ip || !parsed?.dst?.ip) return

    const { ip: srcIp } = parsed.src
    const { ip: dstIp } = parsed.dst

    if (!adjacency.has(srcIp)) adjacency.set(srcIp, new Set())
    if (!adjacency.has(dstIp)) adjacency.set(dstIp, new Set())
    adjacency.get(srcIp).add(dstIp)
    adjacency.get(dstIp).add(srcIp)

    connectionCounts.set(srcIp, (connectionCounts.get(srcIp) || 0) + 1)
    connectionCounts.set(dstIp, (connectionCounts.get(dstIp) || 0) + 1)
  })

  // Find center node: the IP with the highest connection count.
  // Ties are broken by insertion order (first inserted stays center).
  let centerIp = null
  let maxCount = 0
  connectionCounts.forEach((count, ip) => {
    if (count > maxCount) {
      maxCount = count
      centerIp = ip
    }
  })

  const depthMap = new Map()
  const parentMap = new Map()

  if (centerIp) {
    depthMap.set(centerIp, 0)
    const queue = [centerIp]
    while (queue.length > 0) {
      const current = queue.shift()
      const currentDepth = depthMap.get(current)
      for (const neighbor of (adjacency.get(current) || [])) {
        if (!depthMap.has(neighbor)) {
          depthMap.set(neighbor, currentDepth + 1)
          parentMap.set(neighbor, current)
          queue.push(neighbor)
        }
      }
    }
  }

  return { centerIp, depthMap, parentMap, connectionCounts, adjacency }
}

// ---------------------------------------------------------------------------
// Force-directed layout engine (extracted from MindMap.jsx)
// All functions below are pure — no React dependencies.
// ---------------------------------------------------------------------------

/** Clamp a value between min and max. */
export const clamp = (v, min, max) => Math.max(min, Math.min(max, v))

/**
 * Calculate canvas size based on node and connection counts.
 * @param {number} nodeCount
 * @param {number} connectionCount
 * @returns {number} logical canvas size in pixels
 */
export const calculateCanvasSize = (nodeCount, connectionCount) => {
  const baseNodeSpace = 260
  const connectionFactor = Math.sqrt(connectionCount / Math.max(nodeCount, 1))
  const minArea = nodeCount * baseNodeSpace * (1 + connectionFactor * 0.5)
  const minSize = Math.sqrt(minArea)
  const size = Math.max(900, Math.min(5000, minSize))
  return Math.ceil(size)
}

/** Base force-directed layout parameters. */
export const FORCE_PARAMS = {
  baseRepulsion: 1800,
  baseLinkDistance: 320,
  baseGravity: 0.015,
  repulsionScale: 1.0,
  linkDistanceScale: 1.0,
  gravityScale: 1.0,
  collisionRadius: 5.0,
  collisionStrength: 0.8,
  damping: 0.85,
  maxVelocity: 1.0,
  minVelocity: 0.001,
  initialIterations: 100,
  stabilityThreshold: 0.01
}

/**
 * Compute dynamic force parameters scaled to canvas size and node count.
 * @param {number} nodeCount
 * @param {number} canvasSize
 */
export const calculateDynamicForceParams = (nodeCount, canvasSize) => {
  const diagonal = Math.sqrt(2) * canvasSize
  const countFactor = Math.sqrt(nodeCount / 10)
  const sizeFactor = canvasSize / 1000

  return {
    repulsion: FORCE_PARAMS.baseRepulsion * sizeFactor * (1 + countFactor * 0.3),
    linkDistance: (diagonal / 4) * (1 + countFactor * 0.15),
    gravity: Math.max(0.001, FORCE_PARAMS.baseGravity / sizeFactor * (1 - Math.min(countFactor * 0.35, 0.9))),
    collisionRadius: FORCE_PARAMS.collisionRadius * sizeFactor * Math.max(1, countFactor * 0.7),
    canvasSize,
    diagonal
  }
}

/**
 * Calculate all forces acting on nodes for one simulation step.
 * @param {object[]} nodes
 * @param {{ src: string, dst: string }[]} connections
 * @param {object} params - force parameters (from calculateDynamicForceParams + FORCE_PARAMS)
 * @returns {Map<string, {x: number, y: number}>} force vectors keyed by node id
 */
export const calculateForces = (nodes, connections, params) => {
  const forces = new Map()
  const canvasSize = params.canvasSize || 1000
  const centerX = canvasSize / 2
  const centerY = canvasSize / 2

  nodes.forEach(node => { forces.set(node.id, { x: 0, y: 0 }) })

  // 1. 節點間斥力（庫侖斥力：F = k / r²）
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const nodeA = nodes[i]
      const nodeB = nodes[j]
      if (!isFinite(nodeA.x) || !isFinite(nodeA.y) || !isFinite(nodeB.x) || !isFinite(nodeB.y)) continue
      const dx = nodeB.x - nodeA.x
      const dy = nodeB.y - nodeA.y
      const dist = Math.hypot(dx, dy)
      if (!isFinite(dist) || dist < 0.1) continue
      const repulsionForce = params.repulsion / (dist * dist)
      const fx = (dx / dist) * repulsionForce
      const fy = (dy / dist) * repulsionForce
      const forceA = forces.get(nodeA.id)
      const forceB = forces.get(nodeB.id)
      forceA.x -= fx; forceA.y -= fy
      forceB.x += fx; forceB.y += fy
    }
  }

  // 2. 連線引力（胡克引力：F = k * (r - r0)）
  const nodeMap = new Map(nodes.map(n => [n.id, n]))
  connections.forEach(conn => {
    const nodeA = nodeMap.get(conn.src)
    const nodeB = nodeMap.get(conn.dst)
    if (!nodeA || !nodeB) return
    if (!isFinite(nodeA.x) || !isFinite(nodeA.y) || !isFinite(nodeB.x) || !isFinite(nodeB.y)) return
    const dx = nodeB.x - nodeA.x
    const dy = nodeB.y - nodeA.y
    const dist = Math.hypot(dx, dy)
    if (!isFinite(dist) || dist < 0.1) return
    const isLeafEdge = (nodeA.depth ?? 0) >= 2 || (nodeB.depth ?? 0) >= 2
    const springConstant = isLeafEdge ? 0.25 : 0.1
    const restLength = isLeafEdge ? params.linkDistance * 0.5 : params.linkDistance
    const attractionForce = (dist - restLength) * springConstant
    const fx = (dx / dist) * attractionForce
    const fy = (dy / dist) * attractionForce
    const forceA = forces.get(nodeA.id)
    const forceB = forces.get(nodeB.id)
    forceA.x += fx; forceA.y += fy
    forceB.x -= fx; forceB.y -= fy
  })

  // 3. 重力（拉向畫布中心）
  nodes.forEach(node => {
    if (node.isCenter) return
    if (!isFinite(node.x) || !isFinite(node.y)) return
    const dx = centerX - node.x
    const dy = centerY - node.y
    const dist = Math.hypot(dx, dy)
    if (!isFinite(dist) || dist < 0.1) return
    const depthFactor = (node.depth ?? 1) >= 2 ? 0.2 : 1.0
    const gravityForce = params.gravity * dist * depthFactor
    const force = forces.get(node.id)
    force.x += (dx / dist) * gravityForce
    force.y += (dy / dist) * gravityForce
  })

  // 4. 碰撞力
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const nodeA = nodes[i]
      const nodeB = nodes[j]
      const dx = nodeB.x - nodeA.x
      const dy = nodeB.y - nodeA.y
      const dist = Math.hypot(dx, dy) || 0.1
      const minDist = params.collisionRadius * 2
      if (dist < minDist) {
        const collisionForce = (minDist - dist) * FORCE_PARAMS.collisionStrength
        const fx = (dx / dist) * collisionForce
        const fy = (dy / dist) * collisionForce
        const forceA = forces.get(nodeA.id)
        const forceB = forces.get(nodeB.id)
        forceA.x -= fx; forceA.y -= fy
        forceB.x += fx; forceB.y += fy
      }
    }
  }

  // 5. 矩形邊界回彈力
  const padding = params.collisionRadius * 3
  const boundaryStrength = params.repulsion * 0.5
  const cornerRadius = padding * 2
  const corners = [
    { x: 0, y: 0 }, { x: canvasSize, y: 0 },
    { x: 0, y: canvasSize }, { x: canvasSize, y: canvasSize }
  ]

  nodes.forEach(node => {
    const force = forces.get(node.id)
    if (node.x < padding) force.x += boundaryStrength / (Math.max(node.x, 1) ** 2)
    if (node.x > canvasSize - padding) force.x -= boundaryStrength / (Math.max(canvasSize - node.x, 1) ** 2)
    if (node.y < padding) force.y += boundaryStrength / (Math.max(node.y, 1) ** 2)
    if (node.y > canvasSize - padding) force.y -= boundaryStrength / (Math.max(canvasSize - node.y, 1) ** 2)
    corners.forEach(corner => {
      const dx = node.x - corner.x
      const dy = node.y - corner.y
      const dist = Math.hypot(dx, dy)
      if (dist < cornerRadius && dist > 0.1) {
        const pushForce = (boundaryStrength * 2) / (dist * dist)
        force.x += (dx / dist) * pushForce
        force.y += (dy / dist) * pushForce
      }
    })
  })

  return forces
}

/**
 * Apply force vectors to nodes, update velocities, and enforce boundary constraints.
 * @param {object[]} nodes
 * @param {Map<string, {x,y}>} forces
 * @param {Map<string, {x,y}>} velocities - mutated in place
 * @param {object} params
 * @returns {object[]} updated nodes
 */
export const applyForces = (nodes, forces, velocities, params) => {
  const updatedNodes = []
  const canvasSize = params.canvasSize || 1000
  const padding = params.collisionRadius * 2

  nodes.forEach(node => {
    if (node.isCenter) { updatedNodes.push({ ...node }); return }

    const force = forces.get(node.id) || { x: 0, y: 0 }
    const velocity = velocities.get(node.id) || { x: 0, y: 0 }

    velocity.x = (velocity.x + force.x) * params.damping
    velocity.y = (velocity.y + force.y) * params.damping

    const maxVel = Math.min(params.maxVelocity * (canvasSize / 1000), 2.0)
    const speed = Math.hypot(velocity.x, velocity.y)
    if (speed > maxVel) {
      velocity.x = (velocity.x / speed) * maxVel
      velocity.y = (velocity.y / speed) * maxVel
    }

    let newX = node.x + velocity.x
    let newY = node.y + velocity.y

    if (!isFinite(newX) || !isFinite(newY)) {
      newX = canvasSize / 2; newY = canvasSize / 2
      velocity.x = 0; velocity.y = 0
    }

    newX = clamp(newX, padding, canvasSize - padding)
    newY = clamp(newY, padding, canvasSize - padding)
    velocities.set(node.id, velocity)
    updatedNodes.push({ ...node, x: newX, y: newY })
  })

  return updatedNodes
}

/**
 * Build initial node layout from timelines using topology-aware polar seeding
 * followed by force-directed stabilization.
 * @param {object[]} timelines
 * @param {number} [canvasSize=1000]
 * @returns {object[]} positioned node objects
 */
export const buildNodeLayout = (timelines, canvasSize = 1000) => {
  const endpoints = new Map()
  const connectionCounts = new Map()

  timelines.forEach((timeline) => {
    const parsed = parseTimelineId(timeline)
    if (!parsed) return
    const addEndpoint = ({ ip, port }, protocol) => {
      if (!ip) return
      const existing = endpoints.get(ip) || { id: ip, ip, ports: new Set(), protocols: new Set() }
      if (port) existing.ports.add(port)
      if (protocol) existing.protocols.add(protocol.toUpperCase())
      endpoints.set(ip, existing)
      connectionCounts.set(ip, (connectionCounts.get(ip) || 0) + 1)
    }
    addEndpoint(parsed.src, timeline.protocol)
    addEndpoint(parsed.dst, timeline.protocol)
  })

  const nodes = Array.from(endpoints.values())
  if (nodes.length === 0) return []

  const topoInfo = buildAdjacencyAndDepth(timelines)
  const centerX = canvasSize / 2
  const centerY = canvasSize / 2
  const baseRadius = canvasSize * 0.42
  const maxLayerRadius = canvasSize * 0.48
  const padding = 50

  const initialNodes = []
  const nodePositionLookup = new Map()

  const centerNodeObj = nodes.find(n => n.id === topoInfo.centerIp) ?? nodes[0]
  const effectiveCenterIp = centerNodeObj?.id ?? null

  const depth1Nodes = []
  const depth2PlusNodes = []
  nodes.forEach(node => {
    const depth = topoInfo.depthMap.get(node.id) ?? 1
    if (node.id !== effectiveCenterIp) {
      if (depth === 1) depth1Nodes.push(node)
      else depth2PlusNodes.push(node)
    }
  })

  if (centerNodeObj) {
    nodePositionLookup.set(centerNodeObj.id, { x: centerX, y: centerY })
    initialNodes.push({
      id: centerNodeObj.id, label: centerNodeObj.ip,
      ports: Array.from(centerNodeObj.ports), protocols: Array.from(centerNodeObj.protocols),
      x: centerX, y: centerY, isCenter: true,
      connectionCount: connectionCounts.get(centerNodeObj.ip) || 0,
      primaryProtocol: Array.from(centerNodeObj.protocols)[0] || 'OTHER',
      depth: 0, parentIp: null
    })
  }

  // depth-1 節點：比例分配扇區極座標播種
  const d1ProtocolGroups = {}
  depth1Nodes.forEach(node => {
    const p = Array.from(node.protocols)[0] || 'OTHER'
    if (!d1ProtocolGroups[p]) d1ProtocolGroups[p] = []
    d1ProtocolGroups[p].push(node)
  })
  const d1Protocols = Object.keys(d1ProtocolGroups)
  const totalD1 = depth1Nodes.length || 1

  // 按節點數量比例分配扇區角度，協議間留 5° 間隔
  const sectorGap = d1Protocols.length > 1 ? (Math.PI / 36) : 0
  const totalGap = sectorGap * Math.max(0, d1Protocols.length - 1)
  const usableAngle = 2 * Math.PI - totalGap

  let cumulativeAngle = 0
  d1Protocols.forEach((protocol) => {
    const groupNodes = d1ProtocolGroups[protocol]
    const sectorRange = usableAngle * (groupNodes.length / totalD1)
    const sectorStart = cumulativeAngle

    groupNodes.forEach((node, ni) => {
      // 均勻角度分佈
      const angle = sectorStart + (sectorRange * (ni + 0.5)) / groupNodes.length
      // 等面積螺旋半徑（sqrt 確保外圈面積均勻）
      const t = (ni + 1) / (groupNodes.length + 1)
      const radius = Math.min(baseRadius * (0.35 + 0.65 * Math.sqrt(t)), maxLayerRadius)
      const x = clamp(centerX + Math.cos(angle) * radius, padding, canvasSize - padding)
      const y = clamp(centerY + Math.sin(angle) * radius, padding, canvasSize - padding)
      nodePositionLookup.set(node.id, { x, y })
      initialNodes.push({
        id: node.id, label: node.ip,
        ports: Array.from(node.ports), protocols: Array.from(node.protocols),
        x, y, isCenter: false,
        connectionCount: connectionCounts.get(node.ip) || 0,
        primaryProtocol: Array.from(node.protocols)[0] || 'OTHER',
        depth: 1, parentIp: topoInfo.parentMap.get(node.id) || null
      })
    })

    cumulativeAngle += sectorRange + sectorGap
  })

  // depth-2+ 節點：依父節點角度放置
  const childrenByParent = new Map()
  depth2PlusNodes.forEach(node => {
    const parentIp = topoInfo.parentMap.get(node.id)
    if (!childrenByParent.has(parentIp)) childrenByParent.set(parentIp, [])
    childrenByParent.get(parentIp).push(node)
  })

  childrenByParent.forEach((children, parentIp) => {
    const parentPos = nodePositionLookup.get(parentIp)
    if (!parentPos) {
      children.forEach(node => {
        const angle = Math.random() * 2 * Math.PI
        const x = clamp(centerX + Math.cos(angle) * baseRadius * 0.8, padding, canvasSize - padding)
        const y = clamp(centerY + Math.sin(angle) * baseRadius * 0.8, padding, canvasSize - padding)
        nodePositionLookup.set(node.id, { x, y })
        initialNodes.push({
          id: node.id, label: node.ip,
          ports: Array.from(node.ports), protocols: Array.from(node.protocols),
          x, y, isCenter: false,
          connectionCount: connectionCounts.get(node.ip) || 0,
          primaryProtocol: Array.from(node.protocols)[0] || 'OTHER',
          depth: topoInfo.depthMap.get(node.id) ?? 2, parentIp
        })
      })
      return
    }
    const parentAngle = Math.atan2(parentPos.y - centerY, parentPos.x - centerX)
    const parentRadius = Math.hypot(parentPos.x - centerX, parentPos.y - centerY)
    const arcSpread = Math.PI / 6
    children.forEach((node, index) => {
      const arcOffset = children.length === 1
        ? 0
        : (index / (children.length - 1) - 0.5) * arcSpread
      const childAngle = parentAngle + arcOffset
      const childRadius = Math.min(parentRadius * 1.25, maxLayerRadius)
      const x = clamp(centerX + Math.cos(childAngle) * childRadius, padding, canvasSize - padding)
      const y = clamp(centerY + Math.sin(childAngle) * childRadius, padding, canvasSize - padding)
      nodePositionLookup.set(node.id, { x, y })
      initialNodes.push({
        id: node.id, label: node.ip,
        ports: Array.from(node.ports), protocols: Array.from(node.protocols),
        x, y, isCenter: false,
        connectionCount: connectionCounts.get(node.ip) || 0,
        primaryProtocol: Array.from(node.protocols)[0] || 'OTHER',
        depth: topoInfo.depthMap.get(node.id) ?? 2, parentIp
      })
    })
  })

  // 力導向圖迭代穩定布局
  const edgeList = []
  timelines.forEach((timeline) => {
    const parsed = parseTimelineId(timeline)
    if (parsed?.src?.ip && parsed?.dst?.ip) edgeList.push({ src: parsed.src.ip, dst: parsed.dst.ip })
  })

  const forceParams = calculateDynamicForceParams(nodes.length, canvasSize)
  const params = { ...FORCE_PARAMS, ...forceParams }

  let currentNodes = initialNodes
  const velocities = new Map()
  currentNodes.forEach(node => { velocities.set(node.id, { x: 0, y: 0 }) })

  const iterationCount = Math.max(params.initialIterations, Math.min(300, nodes.length * 5))
  for (let iter = 0; iter < iterationCount; iter++) {
    const forces = calculateForces(currentNodes, edgeList, params)
    currentNodes = applyForces(currentNodes, forces, velocities, params)
  }

  return currentNodes
}
