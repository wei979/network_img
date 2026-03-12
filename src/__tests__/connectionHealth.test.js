import { describe, it, expect } from 'vitest'
import { computeConnectionHealth, computeNodeDegreeHealth, computeOverallHealthWithNodes, buildOverviewHealthFromDetailed, computeOverallHealthFromMap, computeOverallHealthFromMapWithNodes } from '../lib/connectionHealth.js'

// Helper: build a minimal connection object
const makeConn = (protocolType, metrics) => ({ protocolType, metrics })

describe('computeConnectionHealth', () => {
  it('tcp-handshake healthy — rttMs=10', () => {
    const result = computeConnectionHealth(makeConn('tcp-handshake', { rttMs: 10, packetCount: 3 }))
    expect(result.status).toBe('healthy')
    expect(result.score).toBe(100)
    expect(result.issues).toHaveLength(0)
    expect(result.mainMetric).toBe('RTT: 10ms')
  })

  it('tcp-handshake warning — rttMs=80', () => {
    const result = computeConnectionHealth(makeConn('tcp-handshake', { rttMs: 80 }))
    expect(result.status).toBe('warning')
    expect(result.score).toBe(70) // 100 - 30
    expect(result.issues).toContain('TCP RTT 偏高（50-200ms）')
  })

  it('tcp-handshake critical — rttMs=300', () => {
    const result = computeConnectionHealth(makeConn('tcp-handshake', { rttMs: 300 }))
    expect(result.status).toBe('critical')
    expect(result.score).toBe(40) // 100 - 60
    expect(result.issues).toContain('TCP RTT 過高（>=200ms）')
  })

  it('syn-flood critical — isFlood=true, synRatio=0.95', () => {
    const result = computeConnectionHealth(makeConn('syn-flood', { isFlood: true, synRatio: 0.95, packetCount: 5000 }))
    expect(result.status).toBe('critical')
    // 80 (isFlood) + 70 (synRatio) = 150, clamped to 0
    expect(result.score).toBe(0)
    expect(result.issues).toContain('偵測到洪泛攻擊')
    expect(result.issues).toContain('SYN 旗標異常佔比（疑似 SYN Flood）')
  })

  it('psh-flood warning — pshRatio=0.92, isFlood=false', () => {
    const result = computeConnectionHealth(makeConn('psh-flood', { pshRatio: 0.92, isFlood: false }))
    expect(result.status).toBe('warning')
    expect(result.score).toBe(60) // 100 - 40
    expect(result.issues).toContain('PSH 旗標異常佔比')
  })

  // BUG REPRO: Phase 2 (normal-connection path) PSH flood has pshRatio 0.6-0.9 range.
  // Backend classifies as 'psh-flood' at psh_ratio > 0.6, but frontend rule fired at > 0.9.
  it('psh-flood warning — pshRatio=0.65 (Phase 2 connection, backend threshold = 0.6)', () => {
    const result = computeConnectionHealth(makeConn('psh-flood', { pshRatio: 0.65, packetCount: 30 }))
    expect(result.status).toBe('warning')
    expect(result.issues).toContain('PSH 旗標異常佔比')
  })

  it('pshRatio=0.61 triggers warning (boundary — aligned with backend 0.6 threshold)', () => {
    const result = computeConnectionHealth(makeConn('psh-flood', { pshRatio: 0.61 }))
    expect(result.status).toBe('warning')
    expect(result.issues).toContain('PSH 旗標異常佔比')
  })

  it('pshRatio=0.59 does NOT trigger PSH warning (below 0.6 threshold)', () => {
    const result = computeConnectionHealth(makeConn('psh-flood', { pshRatio: 0.59 }))
    expect(result.issues).not.toContain('PSH 旗標異常佔比')
  })

  it('pshRatio=0.9 still triggers warning (continuity at old boundary)', () => {
    const result = computeConnectionHealth(makeConn('psh-flood', { pshRatio: 0.9 }))
    expect(result.status).toBe('warning')
    expect(result.issues).toContain('PSH 旗標異常佔比')
  })

  it('timeout critical — timeoutMs=5000', () => {
    const result = computeConnectionHealth(makeConn('timeout', { timeoutMs: 5000 }))
    expect(result.status).toBe('critical')
    expect(result.score).toBe(30) // 100 - 70
    expect(result.issues).toContain('連線逾時（>=3s 封包間隔）')
    expect(result.mainMetric).toBe('逾時: 5000ms')
  })

  it('timeout warning — timeoutMs=2000', () => {
    const result = computeConnectionHealth(makeConn('timeout', { timeoutMs: 2000 }))
    expect(result.status).toBe('warning')
    expect(result.score).toBe(65) // 100 - 35
    expect(result.issues).toContain('連線回應遲緩（1-3s）')
  })

  it('http-request healthy — responseTimeMs=200', () => {
    const result = computeConnectionHealth(makeConn('http-request', { responseTimeMs: 200 }))
    expect(result.status).toBe('healthy')
    expect(result.score).toBe(100)
    expect(result.mainMetric).toBe('RT: 200ms')
  })

  it('http-request critical — responseTimeMs=3000', () => {
    const result = computeConnectionHealth(makeConn('http-request', { responseTimeMs: 3000 }))
    expect(result.status).toBe('critical')
    expect(result.score).toBe(40) // 100 - 60
    expect(result.issues).toContain('HTTP/S 回應過慢（>=2s）')
  })

  it('http-request warning — responseTimeMs=800', () => {
    const result = computeConnectionHealth(makeConn('http-request', { responseTimeMs: 800 }))
    expect(result.status).toBe('warning')
    expect(result.score).toBe(75) // 100 - 25
    expect(result.issues).toContain('HTTP/S 回應偏慢（500ms-2s）')
  })

  it('udp-transfer healthy — no special metrics', () => {
    const result = computeConnectionHealth(makeConn('udp-transfer', { packetCount: 42, totalBytes: 1024 }))
    expect(result.status).toBe('healthy')
    expect(result.score).toBe(100)
    expect(result.issues).toHaveLength(0)
    expect(result.mainMetric).toBe('pkt: 42')
  })

  it('metrics null/undefined — does not crash, returns healthy', () => {
    const resultNull = computeConnectionHealth(makeConn('tcp-handshake', null))
    expect(resultNull.status).toBe('healthy')
    expect(resultNull.score).toBe(100)

    const resultUndef = computeConnectionHealth(makeConn('tcp-handshake', undefined))
    expect(resultUndef.status).toBe('healthy')

    const resultEmpty = computeConnectionHealth({})
    expect(resultEmpty.status).toBe('healthy')

    const resultNullConn = computeConnectionHealth(null)
    expect(resultNullConn.status).toBe('healthy')
  })

  it('tcp-teardown warning — teardownDurationMs=6000', () => {
    const result = computeConnectionHealth(makeConn('tcp-teardown', { teardownDurationMs: 6000 }))
    expect(result.status).toBe('warning')
    expect(result.score).toBe(80) // 100 - 20
    expect(result.issues).toContain('TCP 揮手異常延遲（>5s）')
    expect(result.mainMetric).toBe('揮手: 6000ms')
  })

  // ---- Boundary value tests (H-6) ----

  it('rttMs=200 is critical (boundary: >= 200 triggers critical)', () => {
    const result = computeConnectionHealth(makeConn('tcp-handshake', { rttMs: 200 }))
    expect(result.status).toBe('critical')
    expect(result.score).toBe(40) // 100 - 60
  })

  it('rttMs=50 is warning (boundary: >= 50 triggers warning)', () => {
    const result = computeConnectionHealth(makeConn('tcp-handshake', { rttMs: 50 }))
    expect(result.status).toBe('warning')
    expect(result.score).toBe(70) // 100 - 30
  })

  it('rttMs=49 is healthy (below warning threshold)', () => {
    const result = computeConnectionHealth(makeConn('tcp-handshake', { rttMs: 49 }))
    expect(result.status).toBe('healthy')
    expect(result.score).toBe(100)
  })

  it('timeoutMs=3000 is critical (boundary: >= 3000 triggers critical)', () => {
    const result = computeConnectionHealth(makeConn('timeout', { timeoutMs: 3000 }))
    expect(result.status).toBe('critical')
    expect(result.score).toBe(30) // 100 - 70
  })

  it('timeoutMs=1000 is warning (boundary: >= 1000 triggers warning)', () => {
    const result = computeConnectionHealth(makeConn('timeout', { timeoutMs: 1000 }))
    expect(result.status).toBe('warning')
    expect(result.score).toBe(65) // 100 - 35
  })

  it('responseTimeMs=500 is warning (boundary: >= 500 triggers warning)', () => {
    const result = computeConnectionHealth(makeConn('http-request', { responseTimeMs: 500 }))
    expect(result.status).toBe('warning')
    expect(result.score).toBe(75) // 100 - 25
  })

  it('responseTimeMs=2000 is critical (boundary: >= 2000 triggers critical)', () => {
    const result = computeConnectionHealth(makeConn('http-request', { responseTimeMs: 2000 }))
    expect(result.status).toBe('critical')
    expect(result.score).toBe(40) // 100 - 60
  })

  it('responseTimeMs=499 is healthy (below warning threshold)', () => {
    const result = computeConnectionHealth(makeConn('http-request', { responseTimeMs: 499 }))
    expect(result.status).toBe('healthy')
    expect(result.score).toBe(100)
  })

  it('fin-flood critical — finRatio=0.95', () => {
    const result = computeConnectionHealth(makeConn('fin-flood', { finRatio: 0.95, packetCount: 100 }))
    expect(result.status).toBe('critical')
    expect(result.score).toBe(30) // 100 - 70
    expect(result.issues).toContain('FIN 旗標異常佔比（疑似 FIN Flood）')
  })

  it('fin-flood healthy — finRatio=0.5 (below threshold)', () => {
    const result = computeConnectionHealth(makeConn('fin-flood', { finRatio: 0.5 }))
    expect(result.status).toBe('healthy')
    expect(result.score).toBe(100)
  })

  // HIGH-4: aggregated connection has primaryProtocolType but no protocolType
  it('aggregated connection — no protocolType, only primaryProtocolType — RTT still displayed', () => {
    const aggConn = {
      primaryProtocolType: 'tcp-handshake',
      // no protocolType field
      metrics: { rttMs: 120, packetCount: 10 },
    }
    const result = computeConnectionHealth(aggConn)
    expect(result.status).toBe('warning')
    expect(result.mainMetric).toBe('RTT: 120ms')
  })

  it('aggregated connection — syn-flood synthesized metrics detected correctly', () => {
    // Simulates what buildAggregatedConnections produces after merging child connections
    const aggConn = {
      primaryProtocolType: 'syn-flood',
      metrics: { isFlood: true, synRatio: 0.92, packetCount: 500 },
    }
    const result = computeConnectionHealth(aggConn)
    expect(result.status).toBe('critical')
    expect(result.issues).toContain('偵測到洪泛攻擊')
    expect(result.issues).toContain('SYN 旗標異常佔比（疑似 SYN Flood）')
  })

  // --- New attack type tests ---

  it('ack-flood critical — ackRatio=0.9, isFlood=true', () => {
    const result = computeConnectionHealth(makeConn('ack-flood', { isFlood: true, ackRatio: 0.9, packetCount: 5000 }))
    expect(result.status).toBe('critical')
    expect(result.score).toBe(0) // 80+65=145, clamped
    expect(result.issues).toContain('偵測到洪泛攻擊')
    expect(result.issues).toContain('ACK 旗標異常佔比（疑似 ACK Flood）')
  })

  it('ack-flood healthy — ackRatio=0.79 (below threshold)', () => {
    const result = computeConnectionHealth(makeConn('ack-flood', { ackRatio: 0.79 }))
    expect(result.status).toBe('healthy')
    expect(result.score).toBe(100)
  })

  it('ackRatio=0.8 triggers critical (boundary) — requires isFlood=true', () => {
    const result = computeConnectionHealth(makeConn('ack-flood', { isFlood: true, ackRatio: 0.8 }))
    expect(result.status).toBe('critical')
    expect(result.issues).toContain('ACK 旗標異常佔比（疑似 ACK Flood）')
  })

  it('ackRatio=0.8 without isFlood does not trigger ACK flood rule (normal TCP guard)', () => {
    const result = computeConnectionHealth(makeConn('tcp-handshake', { ackRatio: 0.8 }))
    expect(result.issues).not.toContain('ACK 旗標異常佔比（疑似 ACK Flood）')
  })

  it('rst-flood critical — rstRatio=0.85, isFlood=true', () => {
    const result = computeConnectionHealth(makeConn('rst-flood', { isFlood: true, rstRatio: 0.85, packetCount: 3000 }))
    expect(result.status).toBe('critical')
    expect(result.score).toBe(0) // 80+70=150, clamped
    expect(result.issues).toContain('偵測到洪泛攻擊')
    expect(result.issues).toContain('RST 旗標異常佔比（疑似 RST Flood）')
  })

  it('rst-flood healthy — rstRatio=0.79 (below threshold)', () => {
    const result = computeConnectionHealth(makeConn('rst-flood', { rstRatio: 0.79 }))
    expect(result.status).toBe('healthy')
    expect(result.score).toBe(100)
  })

  it('rstRatio=0.8 triggers critical (boundary) — requires isFlood=true', () => {
    const result = computeConnectionHealth(makeConn('rst-flood', { isFlood: true, rstRatio: 0.8 }))
    expect(result.status).toBe('critical')
    expect(result.issues).toContain('RST 旗標異常佔比（疑似 RST Flood）')
  })

  it('rstRatio=0.8 without isFlood does not trigger RST flood rule (normal TCP guard)', () => {
    const result = computeConnectionHealth(makeConn('tcp-handshake', { rstRatio: 0.8 }))
    expect(result.issues).not.toContain('RST 旗標異常佔比（疑似 RST Flood）')
  })

  it('urg attack critical — urgRatio=0.7', () => {
    const result = computeConnectionHealth(makeConn('tcp-flood', { urgRatio: 0.7, packetCount: 200 }))
    expect(result.status).toBe('critical')
    expect(result.score).toBe(40) // 100 - 60
    expect(result.issues).toContain('URG 旗標異常佔比（疑似 URG 攻擊）')
  })

  it('urgRatio=0.5 triggers critical (boundary)', () => {
    const result = computeConnectionHealth(makeConn('tcp-flood', { urgRatio: 0.5 }))
    expect(result.status).toBe('critical')
    expect(result.issues).toContain('URG 旗標異常佔比（疑似 URG 攻擊）')
  })

  it('urgRatio=0.49 is healthy (below threshold)', () => {
    const result = computeConnectionHealth(makeConn('tcp-flood', { urgRatio: 0.49 }))
    expect(result.status).toBe('healthy')
    expect(result.score).toBe(100)
  })

  it('ack-fin-flood critical — ackRatio=0.7, finRatio=0.7, isFlood=true', () => {
    const result = computeConnectionHealth(makeConn('ack-fin-flood', { isFlood: true, ackRatio: 0.7, finRatio: 0.7, packetCount: 4000 }))
    expect(result.status).toBe('critical')
    expect(result.score).toBe(0)
    expect(result.issues).toContain('偵測到洪泛攻擊')
    expect(result.issues).toContain('ACK+FIN 複合旗標攻擊（疑似 ACK-FIN Flood）')
  })

  it('ack-fin-flood no trigger when only ackRatio high (finRatio too low)', () => {
    const result = computeConnectionHealth(makeConn('ack-fin-flood', { ackRatio: 0.8, finRatio: 0.3 }))
    expect(result.issues).not.toContain('ACK+FIN 複合旗標攻擊（疑似 ACK-FIN Flood）')
  })

  // HIGH guard: composite rules must require isFlood to avoid false positives on normal TCP teardown
  it('ack-fin-flood does NOT trigger without isFlood=true even when both ratios are high', () => {
    const result = computeConnectionHealth(makeConn('tcp-session', { ackRatio: 0.8, finRatio: 0.8 }))
    expect(result.issues).not.toContain('ACK+FIN 複合旗標攻擊（疑似 ACK-FIN Flood）')
  })

  it('urg-psh-fin-flood does NOT trigger without isFlood=true even when all ratios are high', () => {
    const result = computeConnectionHealth(makeConn('tcp-session', { urgRatio: 0.6, pshRatio: 0.6, finRatio: 0.6 }))
    expect(result.issues).not.toContain('URG+PSH+FIN 複合旗標攻擊（Xmas Tree 攻擊變體）')
  })

  it('urg-psh-fin-flood critical — all three ratios=0.6, isFlood=true', () => {
    const result = computeConnectionHealth(makeConn('urg-psh-fin-flood', { isFlood: true, urgRatio: 0.6, pshRatio: 0.6, finRatio: 0.6, packetCount: 2000 }))
    expect(result.status).toBe('critical')
    expect(result.score).toBe(0)
    expect(result.issues).toContain('偵測到洪泛攻擊')
    expect(result.issues).toContain('URG+PSH+FIN 複合旗標攻擊（Xmas Tree 攻擊變體）')
    expect(result.issues).toContain('URG 旗標異常佔比（疑似 URG 攻擊）')
  })

  it('aggregated connection — ack-fin-flood detected via primaryProtocolType', () => {
    const aggConn = {
      primaryProtocolType: 'ack-fin-flood',
      metrics: { isFlood: true, ackRatio: 0.8, finRatio: 0.8, packetCount: 500 },
    }
    const result = computeConnectionHealth(aggConn)
    expect(result.status).toBe('critical')
    expect(result.issues).toContain('偵測到洪泛攻擊')
    expect(result.issues).toContain('ACK+FIN 複合旗標攻擊（疑似 ACK-FIN Flood）')
  })
})


describe('computeNodeDegreeHealth', () => {
  it('connectionCount=0 returns healthy, score 100', () => {
    const result = computeNodeDegreeHealth(0)
    expect(result.status).toBe('healthy')
    expect(result.score).toBe(100)
    expect(result.issues).toHaveLength(0)
  })

  it('connectionCount=10 returns healthy (below warning threshold)', () => {
    const result = computeNodeDegreeHealth(10)
    expect(result.status).toBe('healthy')
    expect(result.score).toBe(100)
  })

  it('connectionCount=11 triggers warning (boundary)', () => {
    const result = computeNodeDegreeHealth(11)
    expect(result.status).toBe('warning')
    expect(result.score).toBe(60)
    expect(result.issues[0]).toContain('節點連線數偏高')
  })

  it('connectionCount=25 is still warning (below critical)', () => {
    const result = computeNodeDegreeHealth(25)
    expect(result.status).toBe('warning')
    expect(result.score).toBe(60)
  })

  it('connectionCount=26 triggers critical (boundary)', () => {
    const result = computeNodeDegreeHealth(26)
    expect(result.status).toBe('critical')
    expect(result.score).toBe(20)
    expect(result.issues[0]).toContain('節點連線數異常')
  })

  it('connectionCount=100 is critical', () => {
    const result = computeNodeDegreeHealth(100)
    expect(result.status).toBe('critical')
    expect(result.score).toBe(20)
  })

  it('undefined connectionCount returns healthy defensively', () => {
    const result = computeNodeDegreeHealth(undefined)
    expect(result.status).toBe('healthy')
    expect(result.score).toBe(100)
  })

  it('NaN connectionCount returns healthy defensively', () => {
    const result = computeNodeDegreeHealth(NaN)
    expect(result.status).toBe('healthy')
    expect(result.score).toBe(100)
  })
})

describe('computeOverallHealthWithNodes', () => {
  it('all healthy connections + no node issues = score 100', () => {
    const connections = [makeConn('tcp-handshake', { rttMs: 5 })]
    const nodeResults = [{ status: 'healthy', score: 100 }]
    const result = computeOverallHealthWithNodes(connections, nodeResults)
    expect(result.score).toBe(100)
    expect(result.nodeCritical).toBe(0)
    expect(result.nodeWarning).toBe(0)
  })

  it('healthy connections + one critical node lowers score', () => {
    const connections = [makeConn('tcp-handshake', { rttMs: 5 })] // healthy → 100
    const nodeResults = [{ status: 'critical', score: 20 }]
    // (100 + 20) / 2 = 60
    const result = computeOverallHealthWithNodes(connections, nodeResults)
    expect(result.score).toBe(60)
    expect(result.nodeCritical).toBe(1)
    expect(result.nodeWarning).toBe(0)
  })

  it('empty connections + critical node = score from node only', () => {
    const result = computeOverallHealthWithNodes([], [{ status: 'critical', score: 20 }])
    expect(result.score).toBe(20)
    expect(result.nodeCritical).toBe(1)
  })

  it('empty connections + empty nodes = score 100', () => {
    const result = computeOverallHealthWithNodes([], [])
    expect(result.score).toBe(100)
  })

  it('mixed: warning connection + warning node', () => {
    const connections = [makeConn('tcp-handshake', { rttMs: 80 })] // warning → 65
    const nodeResults = [{ status: 'warning', score: 60 }]
    // STATUS_WEIGHTS: warning=65 for both? No — we use actual scores from computeConnectionHealth
    // connection health: 65, node health: 65 → (65+65)/2 = 65
    const result = computeOverallHealthWithNodes(connections, nodeResults)
    expect(result.score).toBeGreaterThan(60)
    expect(result.score).toBeLessThan(70)
    expect(result.nodeWarning).toBe(1)
  })
})

describe('buildOverviewHealthFromDetailed', () => {
  const makeDetailedConn = (src, dst, protocolType, metrics) => ({
    id: `${protocolType}-${src}-1000-${dst}-80-0`,
    src,
    dst,
    protocolType,
    metrics,
  })
  const makeAggConn = (src, dst) => ({
    id: `aggregated-${src}<->${dst}`,
    src,
    dst,
  })

  it('empty inputs return empty Map', () => {
    const result = buildOverviewHealthFromDetailed([], [])
    expect(result.size).toBe(0)
  })

  it('single group, single connection matches direct computeConnectionHealth', () => {
    const detailed = [makeDetailedConn('10.0.0.1', '10.0.0.2', 'tcp-handshake', { rttMs: 10 })]
    const agg = [makeAggConn('10.0.0.1', '10.0.0.2')]
    const result = buildOverviewHealthFromDetailed(detailed, agg)
    expect(result.has(agg[0].id)).toBe(true)
    const health = result.get(agg[0].id)
    expect(health.status).toBe('healthy')
    expect(health.score).toBe(100)
  })

  it('single group, worst-case wins among multiple connections', () => {
    const detailed = [
      makeDetailedConn('10.0.0.1', '10.0.0.2', 'tcp-handshake', { rttMs: 10 }),   // healthy
      makeDetailedConn('10.0.0.1', '10.0.0.2', 'syn-flood', { isFlood: true, synRatio: 0.95 }), // critical
      makeDetailedConn('10.0.0.1', '10.0.0.2', 'tcp-handshake', { rttMs: 80 }),   // warning
    ]
    const agg = [makeAggConn('10.0.0.1', '10.0.0.2')]
    const result = buildOverviewHealthFromDetailed(detailed, agg)
    const health = result.get(agg[0].id)
    expect(health.status).toBe('critical')
    expect(health.score).toBe(0) // 100 - 80(isFlood) - 70(synRatio) = -50, clamped to 0
    expect(health.issues).toContain('偵測到洪泛攻擊')
  })

  it('multiple groups produce separate entries', () => {
    const detailed = [
      makeDetailedConn('10.0.0.1', '10.0.0.2', 'tcp-handshake', { rttMs: 10 }),
      makeDetailedConn('10.0.0.1', '10.0.0.3', 'timeout', { timeoutMs: 5000 }),
    ]
    const agg = [
      makeAggConn('10.0.0.1', '10.0.0.2'),
      makeAggConn('10.0.0.1', '10.0.0.3'),
    ]
    const result = buildOverviewHealthFromDetailed(detailed, agg)
    expect(result.size).toBe(2)
    expect(result.get(agg[0].id).status).toBe('healthy')
    expect(result.get(agg[1].id).status).toBe('critical')
  })

  it('direction independence: detailed src/dst reversed from aggregated key', () => {
    // agg was keyed as B<->A, but detailed connection has src=A, dst=B
    const detailed = [makeDetailedConn('10.0.0.2', '10.0.0.1', 'syn-flood', { isFlood: true, synRatio: 0.95 })]
    const agg = [makeAggConn('10.0.0.1', '10.0.0.2')] // reversed from detailed
    const result = buildOverviewHealthFromDetailed(detailed, agg)
    expect(result.has(agg[0].id)).toBe(true)
    expect(result.get(agg[0].id).status).toBe('critical')
  })

  it('issues are deduplicated across connections in same group', () => {
    const detailed = [
      makeDetailedConn('10.0.0.1', '10.0.0.2', 'tcp-handshake', { rttMs: 300 }), // TCP RTT 過高
      makeDetailedConn('10.0.0.1', '10.0.0.2', 'tcp-handshake', { rttMs: 250 }), // TCP RTT 過高 (same issue)
    ]
    const agg = [makeAggConn('10.0.0.1', '10.0.0.2')]
    const result = buildOverviewHealthFromDetailed(detailed, agg)
    const health = result.get(agg[0].id)
    const rttIssues = health.issues.filter(i => i.includes('RTT 過高'))
    expect(rttIssues).toHaveLength(1) // deduplicated
  })

  it('null metrics in some connections handled gracefully', () => {
    const detailed = [
      makeDetailedConn('10.0.0.1', '10.0.0.2', 'tcp-handshake', null),  // no metrics = healthy
      makeDetailedConn('10.0.0.1', '10.0.0.2', 'tcp-handshake', { rttMs: 80 }), // warning
    ]
    const agg = [makeAggConn('10.0.0.1', '10.0.0.2')]
    const result = buildOverviewHealthFromDetailed(detailed, agg)
    expect(result.get(agg[0].id).status).toBe('warning')
  })

  it('aggregated connection with no matching detailed connections returns healthy', () => {
    const detailed = [] // no connections
    const agg = [makeAggConn('10.0.0.1', '10.0.0.2')]
    const result = buildOverviewHealthFromDetailed(detailed, agg)
    expect(result.has(agg[0].id)).toBe(true)
    expect(result.get(agg[0].id).status).toBe('healthy')
  })
})

describe('computeOverallHealthFromMap', () => {
  it('empty map returns score 100', () => {
    const result = computeOverallHealthFromMap(new Map())
    expect(result.score).toBe(100)
    expect(result.critical).toBe(0)
    expect(result.warning).toBe(0)
    expect(result.healthy).toBe(0)
  })

  it('all healthy entries returns score 100', () => {
    const map = new Map([
      ['a', { status: 'healthy' }],
      ['b', { status: 'healthy' }],
    ])
    const result = computeOverallHealthFromMap(map)
    expect(result.score).toBe(100)
    expect(result.healthy).toBe(2)
  })

  it('mixed entries compute correct weighted average', () => {
    const map = new Map([
      ['a', { status: 'healthy' }],   // 100
      ['b', { status: 'warning' }],   // 65
      ['c', { status: 'critical' }],  // 20
    ])
    const result = computeOverallHealthFromMap(map)
    expect(result.critical).toBe(1)
    expect(result.warning).toBe(1)
    expect(result.healthy).toBe(1)
    expect(result.score).toBe(Math.round((100 + 65 + 20) / 3)) // 62
  })

  it('all critical entries returns score 20', () => {
    const map = new Map([
      ['a', { status: 'critical' }],
      ['b', { status: 'critical' }],
    ])
    const result = computeOverallHealthFromMap(map)
    expect(result.score).toBe(20)
    expect(result.critical).toBe(2)
  })
})

describe('computeOverallHealthFromMapWithNodes', () => {
  it('empty map + empty nodes = score 100', () => {
    const result = computeOverallHealthFromMapWithNodes(new Map(), [])
    expect(result.score).toBe(100)
    expect(result.critical).toBe(0)
    expect(result.warning).toBe(0)
    expect(result.healthy).toBe(0)
    expect(result.nodeCritical).toBe(0)
    expect(result.nodeWarning).toBe(0)
  })

  it('all healthy connections + all healthy nodes = score 100', () => {
    const map = new Map([['a', { status: 'healthy' }], ['b', { status: 'healthy' }]])
    const nodeResults = [{ status: 'healthy' }, { status: 'healthy' }]
    const result = computeOverallHealthFromMapWithNodes(map, nodeResults)
    expect(result.score).toBe(100)
    expect(result.healthy).toBe(2)
    expect(result.nodeCritical).toBe(0)
  })

  it('BUG REPRO: 1 healthy connection + 2 critical nodes = score 47, not 100', () => {
    const map = new Map([['conn1', { status: 'healthy' }]])
    const nodeResults = [{ status: 'critical' }, { status: 'critical' }]
    const result = computeOverallHealthFromMapWithNodes(map, nodeResults)
    // (100 + 20 + 20) / 3 = 46.67 → rounded = 47
    expect(result.score).toBe(47)
    expect(result.healthy).toBe(1)
    expect(result.nodeCritical).toBe(2)
    expect(result.nodeWarning).toBe(0)
  })

  it('mixed connections + mixed nodes produce correct weighted average', () => {
    const map = new Map([
      ['a', { status: 'healthy' }],   // 100
      ['b', { status: 'critical' }],  // 20
    ])
    const nodeResults = [{ status: 'warning' }] // 65
    // (100 + 20 + 65) / 3 = 61.67 → 62
    const result = computeOverallHealthFromMapWithNodes(map, nodeResults)
    expect(result.score).toBe(62)
    expect(result.critical).toBe(1)
    expect(result.healthy).toBe(1)
    expect(result.nodeWarning).toBe(1)
    expect(result.nodeCritical).toBe(0)
  })

  it('connection health and node health counters are independent', () => {
    const map = new Map([
      ['a', { status: 'warning' }],
      ['b', { status: 'critical' }],
    ])
    const nodeResults = [{ status: 'critical' }, { status: 'warning' }]
    const result = computeOverallHealthFromMapWithNodes(map, nodeResults)
    expect(result.critical).toBe(1)       // connection-level critical count
    expect(result.warning).toBe(1)        // connection-level warning count
    expect(result.nodeCritical).toBe(1)   // node-level critical count
    expect(result.nodeWarning).toBe(1)    // node-level warning count
    // (20 + 65 + 20 + 65) / 4 = 42.5 → 43
    expect(result.score).toBe(43)
  })

  it('only nodes, no connections', () => {
    const map = new Map()
    const nodeResults = [{ status: 'critical' }, { status: 'warning' }]
    // (20 + 65) / 2 = 42.5 → 43
    const result = computeOverallHealthFromMapWithNodes(map, nodeResults)
    expect(result.score).toBe(43)
    expect(result.critical).toBe(0)
    expect(result.healthy).toBe(0)
    expect(result.nodeCritical).toBe(1)
    expect(result.nodeWarning).toBe(1)
  })
})
