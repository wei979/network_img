/**
 * connectionHealth.js
 * 純函數健康評分工具 — 依據 network-protocols 知識庫閾值計算每條連線的健康狀態
 */

/**
 * 評分規則定義
 * 每條規則包含：條件函數、狀態、扣分、issue 說明文字
 */
const HEALTH_RULES = [
  {
    check: (m) => m.isFlood === true,
    status: 'critical',
    penalty: 80,
    issue: '偵測到洪泛攻擊',
  },
  {
    check: (m) => typeof m.synRatio === 'number' && m.synRatio > 0.8,
    status: 'critical',
    penalty: 70,
    issue: 'SYN 旗標異常佔比（疑似 SYN Flood）',
  },
  {
    check: (m) => typeof m.pshRatio === 'number' && m.pshRatio > 0.6,
    status: 'warning',
    penalty: 40,
    issue: 'PSH 旗標異常佔比',
  },
  {
    check: (m) => typeof m.finRatio === 'number' && m.finRatio > 0.9,
    status: 'critical',
    penalty: 70,
    issue: 'FIN 旗標異常佔比（疑似 FIN Flood）',
  },
  // ACK flood: ACK は正常 TCP セッションでも高頻度のため isFlood で後段フィルタ
  {
    check: (m) => m.isFlood === true && typeof m.ackRatio === 'number' && m.ackRatio >= 0.8,
    status: 'critical',
    penalty: 65,
    issue: 'ACK 旗標異常佔比（疑似 ACK Flood）',
  },
  // RST flood: 同上，需 isFlood 才能與正常 TCP RST 區分
  {
    check: (m) => m.isFlood === true && typeof m.rstRatio === 'number' && m.rstRatio >= 0.8,
    status: 'critical',
    penalty: 70,
    issue: 'RST 旗標異常佔比（疑似 RST Flood）',
  },
  {
    check: (m) => typeof m.urgRatio === 'number' && m.urgRatio >= 0.5,
    status: 'critical',
    penalty: 60,
    issue: 'URG 旗標異常佔比（疑似 URG 攻擊）',
  },
  // ACK+FIN 複合：需 isFlood 才能與正常 TCP 揮手（ACK+FIN 交替）區分，加分規則均累加
  {
    check: (m) => m.isFlood === true && typeof m.ackRatio === 'number' && typeof m.finRatio === 'number' && m.ackRatio >= 0.5 && m.finRatio >= 0.5,
    status: 'critical',
    penalty: 75,
    issue: 'ACK+FIN 複合旗標攻擊（疑似 ACK-FIN Flood）',
  },
  // URG+PSH+FIN 複合：需 isFlood 才能與短暫資料傳輸區分；URG 子規則仍獨立累加（加分模型）
  {
    check: (m) => m.isFlood === true && typeof m.urgRatio === 'number' && typeof m.pshRatio === 'number' && typeof m.finRatio === 'number' && m.urgRatio >= 0.5 && m.pshRatio >= 0.5 && m.finRatio >= 0.5,
    status: 'critical',
    penalty: 75,
    issue: 'URG+PSH+FIN 複合旗標攻擊（Xmas Tree 攻擊變體）',
  },
  {
    check: (m) => typeof m.rttMs === 'number' && m.rttMs >= 200,
    status: 'critical',
    penalty: 60,
    issue: 'TCP RTT 過高（>=200ms）',
  },
  {
    check: (m) => typeof m.rttMs === 'number' && m.rttMs >= 50 && m.rttMs < 200,
    status: 'warning',
    penalty: 30,
    issue: 'TCP RTT 偏高（50-200ms）',
  },
  {
    check: (m) => typeof m.timeoutMs === 'number' && m.timeoutMs >= 3000,
    status: 'critical',
    penalty: 70,
    issue: '連線逾時（>=3s 封包間隔）',
  },
  {
    check: (m) => typeof m.timeoutMs === 'number' && m.timeoutMs >= 1000 && m.timeoutMs < 3000,
    status: 'warning',
    penalty: 35,
    issue: '連線回應遲緩（1-3s）',
  },
  {
    check: (m) => typeof m.responseTimeMs === 'number' && m.responseTimeMs >= 2000,
    status: 'critical',
    penalty: 60,
    issue: 'HTTP/S 回應過慢（>=2s）',
  },
  {
    check: (m) => typeof m.responseTimeMs === 'number' && m.responseTimeMs >= 500 && m.responseTimeMs < 2000,
    status: 'warning',
    penalty: 25,
    issue: 'HTTP/S 回應偏慢（500ms-2s）',
  },
  {
    check: (m) => typeof m.teardownDurationMs === 'number' && m.teardownDurationMs > 5000,
    status: 'warning',
    penalty: 20,
    issue: 'TCP 揮手異常延遲（>5s）',
  },
]

/**
 * 加權評分常數：healthy=100, warning=65, critical=20
 * 用於所有 computeOverallHealth* 函數
 */
const STATUS_WEIGHTS = { healthy: 100, warning: 65, critical: 20 }

/**
 * 依據 connection 資料，計算代表性指標文字
 * @param {object} connection
 * @param {object} metrics
 * @returns {string}
 */
function buildMainMetric(connection, metrics) {
  if (!metrics) return ''

  const pt = connection.protocolType || connection.primaryProtocolType || ''

  if (typeof metrics.rttMs === 'number' && (pt.includes('tcp') || pt.includes('icmp'))) {
    return `RTT: ${metrics.rttMs}ms`
  }
  if (typeof metrics.responseTimeMs === 'number') {
    return `RT: ${metrics.responseTimeMs}ms`
  }
  if (typeof metrics.timeoutMs === 'number') {
    return `逾時: ${metrics.timeoutMs}ms`
  }
  if (typeof metrics.teardownDurationMs === 'number') {
    return `揮手: ${metrics.teardownDurationMs}ms`
  }
  if (metrics.isFlood) {
    return `洪泛攻擊`
  }
  if (typeof metrics.packetCount === 'number') {
    return `pkt: ${metrics.packetCount}`
  }
  return ''
}

/**
 * 計算單條連線的健康狀態
 * @param {object} connection - 含 protocolType 與 metrics 的連線物件
 * @returns {{ status: string, score: number, issues: string[], mainMetric: string }}
 */
export function computeConnectionHealth(connection) {
  const metrics = connection?.metrics ?? null

  if (!metrics) {
    return {
      status: 'healthy',
      score: 100,
      issues: [],
      mainMetric: '',
    }
  }

  const triggeredRules = HEALTH_RULES.filter((rule) => rule.check(metrics))

  const totalPenalty = triggeredRules.reduce((sum, rule) => sum + rule.penalty, 0)
  const score = Math.max(0, 100 - totalPenalty)

  // status 由最嚴重的單條規則決定
  let status = 'healthy'
  if (triggeredRules.some((r) => r.status === 'critical')) {
    status = 'critical'
  } else if (triggeredRules.some((r) => r.status === 'warning')) {
    status = 'warning'
  }

  const issues = triggeredRules.map((r) => r.issue)
  const mainMetric = buildMainMetric(connection, metrics)

  return { status, score, issues, mainMetric }
}


/**
 * Node degree danger thresholds
 */
export const NODE_DEGREE_THRESHOLDS = {
  WARNING: 11,
  CRITICAL: 26,
}

/**
 * Evaluates a node's connection count as a danger signal.
 * @param {number} connectionCount
 * @returns {{ status: string, score: number, issues: string[] }}
 */
export function computeNodeDegreeHealth(connectionCount) {
  const count = typeof connectionCount === 'number' && !isNaN(connectionCount) ? connectionCount : 0

  if (count >= NODE_DEGREE_THRESHOLDS.CRITICAL) {
    return {
      status: 'critical',
      score: 20,
      issues: [`節點連線數異常（${count} 條，>= ${NODE_DEGREE_THRESHOLDS.CRITICAL}），疑似端口掃描/DDoS/C2`],
    }
  }
  if (count >= NODE_DEGREE_THRESHOLDS.WARNING) {
    return {
      status: 'warning',
      score: 60,
      issues: [`節點連線數偏高（${count} 條，>= ${NODE_DEGREE_THRESHOLDS.WARNING}），需關注`],
    }
  }
  return { status: 'healthy', score: 100, issues: [] }
}

/**
 * Computes overall network health including node-level danger signals.
 * @param {object[]} connections
 * @param {{ status: string, score: number }[]} nodeHealthResults
 * @returns {{ score: number, critical: number, warning: number, healthy: number, nodeCritical: number, nodeWarning: number }}
 */
export function computeOverallHealthWithNodes(connections, nodeHealthResults) {


  let weightedSum = 0
  let totalCount = 0
  let criticalCount = 0
  let warningCount = 0
  let healthyCount = 0
  let nodeCritical = 0
  let nodeWarning = 0

  connections.forEach((conn) => {
    const { status } = computeConnectionHealth(conn)
    weightedSum += STATUS_WEIGHTS[status] ?? 100
    totalCount++
    if (status === 'critical') criticalCount++
    else if (status === 'warning') warningCount++
    else healthyCount++
  })

  ;(nodeHealthResults ?? []).forEach((nr) => {
    weightedSum += STATUS_WEIGHTS[nr.status] ?? 100
    totalCount++
    if (nr.status === 'critical') nodeCritical++
    else if (nr.status === 'warning') nodeWarning++
  })

  const score = totalCount === 0 ? 100 : Math.round(weightedSum / totalCount)

  return { score, critical: criticalCount, warning: warningCount, healthy: healthyCount, nodeCritical, nodeWarning }
}

/**
 * Pre-computes health from all detailed connections, grouped by IP pair,
 * taking the worst-case result per group.
 * @param {Array<{id: string, src: string, dst: string, protocolType: string, metrics: object}>} detailedConnections
 * @param {Array<{id: string, src: string, dst: string}>} aggregatedConnections
 * @returns {Map<string, {status: string, score: number, issues: string[], mainMetric: string}>}
 */
export function buildOverviewHealthFromDetailed(detailedConnections, aggregatedConnections) {
  // Normalize IP pair key (sort alphabetically for direction independence)
  const pairKey = (a, b) => [a, b].sort().join('<->')

  // Group detailed connections by normalized IP pair
  const groups = new Map()
  for (const conn of detailedConnections) {
    const key = pairKey(conn.src, conn.dst)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(conn)
  }

  // For each aggregated connection, find its group and compute worst-case health
  const result = new Map()
  for (const agg of aggregatedConnections) {
    const key = pairKey(agg.src, agg.dst)
    const group = groups.get(key) ?? []

    if (group.length === 0) {
      result.set(agg.id, { status: 'healthy', score: 100, issues: [], mainMetric: '' })
      continue
    }

    let worstScore = 100
    let worstStatus = 'healthy'
    const allIssues = new Set()
    let worstMainMetric = ''

    for (const conn of group) {
      const health = computeConnectionHealth(conn)
      if (health.score < worstScore) {
        worstScore = health.score
        worstStatus = health.status
        worstMainMetric = health.mainMetric
      }
      health.issues.forEach(i => allIssues.add(i))
    }

    result.set(agg.id, {
      status: worstStatus,
      score: worstScore,
      issues: Array.from(allIssues),
      mainMetric: worstMainMetric,
    })
  }

  return result
}

/**
 * Computes overall network health from a pre-computed health map AND node health results.
 * Combines connection-level and node-level danger into a single weighted score.
 * @param {Map<string, {status: string}>} healthMap - Pre-computed per-connection health
 * @param {{ status: string }[]} nodeHealthResults - Results from computeNodeDegreeHealth
 * @returns {{ score: number, critical: number, warning: number, healthy: number, nodeCritical: number, nodeWarning: number }}
 */
export function computeOverallHealthFromMapWithNodes(healthMap, nodeHealthResults) {


  let weightedSum = 0
  let totalCount = 0
  let criticalCount = 0
  let warningCount = 0
  let healthyCount = 0
  let nodeCritical = 0
  let nodeWarning = 0

  for (const { status } of (healthMap ?? new Map()).values()) {
    weightedSum += STATUS_WEIGHTS[status] ?? 100
    totalCount++
    if (status === 'critical') criticalCount++
    else if (status === 'warning') warningCount++
    else healthyCount++
  }

  for (const nr of (nodeHealthResults ?? [])) {
    weightedSum += STATUS_WEIGHTS[nr.status] ?? 100
    totalCount++
    if (nr.status === 'critical') nodeCritical++
    else if (nr.status === 'warning') nodeWarning++
  }

  const score = totalCount === 0 ? 100 : Math.round(weightedSum / totalCount)
  return { score, critical: criticalCount, warning: warningCount, healthy: healthyCount, nodeCritical, nodeWarning }
}

/**
 * Computes overall network health from a pre-computed health result map.
 * @param {Map<string, {status: string}>} healthMap
 * @returns {{ score: number, critical: number, warning: number, healthy: number }}
 */
export function computeOverallHealthFromMap(healthMap) {
  if (!healthMap || healthMap.size === 0) {
    return { score: 100, critical: 0, warning: 0, healthy: 0 }
  }


  let weightedSum = 0
  let criticalCount = 0
  let warningCount = 0
  let healthyCount = 0

  for (const { status } of healthMap.values()) {
    weightedSum += STATUS_WEIGHTS[status] ?? 100
    if (status === 'critical') criticalCount++
    else if (status === 'warning') warningCount++
    else healthyCount++
  }

  return {
    score: Math.round(weightedSum / healthMap.size),
    critical: criticalCount,
    warning: warningCount,
    healthy: healthyCount,
  }
}
