import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  CircleDot,
  Clock,
  Loader2,
  RefreshCcw,
  UploadCloud,
  Wifi,
  WifiOff,
  Shield,
  AlertCircle,
  Pause,
  Play,
  Eye,
  EyeOff
} from 'lucide-react'
import { ProtocolAnimationController } from './lib/ProtocolAnimationController'
import { getProtocolColor } from './lib/ProtocolStates'
import PacketParticleSystem from './lib/PacketParticleSystem'
// PacketViewer 已整合到 BatchPacketViewer，不再單獨使用
import BatchPacketViewer from './components/BatchPacketViewer'
import TimelineControls from './components/TimelineControls'
import FloodParticleSystem from './components/FloodParticleSystem'

const API_TIMELINES_URL = '/api/timelines'
const STATIC_TIMELINES_URL = '/data/protocol_timeline_sample.json'
const API_ANALYZE_URL = '/api/analyze'

// 自動檢測後端 API 是否可用，不再依賴環境變數
const ANALYZER_API_ENABLED = true

const PROTOCOL_COLORS = {
  // 基本協議顏色
  tcp: '#38bdf8',
  udp: '#60a5fa',
  http: '#a855f7',
  https: '#14b8a6',
  dns: '#f97316',
  icmp: '#facc15',
  // 特定協議動畫類型顏色
  'tcp-handshake': '#22c55e',   // 綠色 - 連線建立
  'tcp-teardown': '#ef4444',    // 紅色 - 連線關閉
  'tcp-data': '#38bdf8',        // 藍色 - 資料傳輸
  'tcp-session': '#06b6d4',     // 青色 - 完整會話
  'http-request': '#a855f7',    // 紫色 - HTTP 請求
  'https-request': '#14b8a6',   // 藍綠色 - HTTPS 安全請求
  'dns-query': '#f97316',       // 橙色 - DNS 查詢
  'timeout': '#f59e0b',         // 黃橙色 - 超時
  'udp-transfer': '#60a5fa',    // 淡藍色 - UDP 傳輸
  'icmp-ping': '#facc15',       // 黃色 - ICMP Ping
  'ssh-secure': '#10b981'       // 綠色 - SSH 安全連線
}

const STAGE_LABEL_MAP = {
  // TCP 三次握手
  'SYN Sent': 'SYN 送出',
  'SYN-ACK Received': 'SYN-ACK 收到',
  'ACK Confirmed': 'ACK 確認',
  // TCP 四次揮手
  'FIN Sent': 'FIN 送出',
  'ACK (for FIN)': 'ACK 確認',
  'FIN from Peer': '對方 FIN',
  'Final ACK': '最終 ACK',
  // TCP 資料傳輸
  'Data Transfer': '資料傳輸',
  'Data Response': '資料回應',
  // TCP 完整會話
  'Connection Established': '連線建立',
  'Data Exchange': '資料交換',
  'Connection Closed': '連線關閉',
  // UDP
  'UDP Transfer': 'UDP 傳輸'
}

const translateStageLabel = (label) => STAGE_LABEL_MAP[label] ?? label

// 動態畫布尺寸計算（依據節點數量與複雜度）
const calculateCanvasSize = (nodeCount, connectionCount) => {
  // 基礎尺寸：每個節點需要的最小空間
  const baseNodeSpace = 150 // 每個節點佔據的基礎空間
  const connectionFactor = Math.sqrt(connectionCount / Math.max(nodeCount, 1)) // 連線密度影響因子

  // 計算最小所需面積
  const minArea = nodeCount * baseNodeSpace * (1 + connectionFactor * 0.5)

  // 轉換為正方形邊長（保持比例）
  const minSize = Math.sqrt(minArea)

  // 設定最小值與最大值（避免過小或過大）
  const size = Math.max(500, Math.min(3000, minSize))

  // HiDPI 支援：返回邏輯尺寸
  return Math.ceil(size)
}

// 初始靜態值（會在組件中動態計算）
let VIEWBOX_SIZE = 100
let GRID_SIZE = 1000
let GRID_SPACING = 60
let GRID_CENTER = GRID_SIZE / 2
let GRID_SCALE = VIEWBOX_SIZE / GRID_SIZE
let GRID_SPACING_VIEW = GRID_SPACING * GRID_SCALE
let VIEWBOX_CENTER = {
  x: VIEWBOX_SIZE / 2,
  y: VIEWBOX_SIZE / 2
}

const BASE_SPREAD_MULTIPLIER = 25
const SPREAD_DECAY = 0.9

const NODE_OUTER_RADIUS = 2
const NODE_INNER_RADIUS = 1.2
const NODE_LABEL_OFFSET_TOP = 5.4
const NODE_PROTOCOL_OFFSET = 6.2
const CENTRAL_NODE_OUTER_RADIUS = NODE_OUTER_RADIUS * 2.5  // 增大中心節點（1.7 -> 2.5）
const CENTRAL_NODE_INNER_RADIUS = NODE_INNER_RADIUS * 2.2  // 增大中心節點（1.6 -> 2.2）
const CENTRAL_LABEL_OFFSET = NODE_LABEL_OFFSET_TOP + 6.0   // 調整標籤偏移
const GRID_BOUND_MARGIN = Math.max(GRID_SPACING * BASE_SPREAD_MULTIPLIER * 0.08, 40)
const VIEWBOX_PADDING = NODE_OUTER_RADIUS * 3.2
const MIN_NODE_DISTANCE = Math.max(
  NODE_OUTER_RADIUS * 3.6,
  GRID_SPACING_VIEW * BASE_SPREAD_MULTIPLIER * 0.5
)

const CONNECTION_BUNDLE_SPACING = 4
const CONNECTION_ENDPOINT_OFFSET = 0.32

// 力導向圖參數（依據用戶需求設定）
const FORCE_PARAMS = {
  // 基礎參數（會根據節點數量動態調整）
  baseRepulsion: 1000,       // 節點間斥力基礎值（800-1200）
  baseLinkDistance: 200,     // 連線長度基礎值（150-250）
  baseGravity: 0.05,         // 中心引力基礎值（降低以保持節點分散）

  // 動態調整係數
  repulsionScale: 1.0,       // 隨節點數量調整斥力
  linkDistanceScale: 1.0,    // 隨節點數量調整連線長度
  gravityScale: 1.0,         // 隨節點數量調整重力

  // 碰撞檢測
  collisionRadius: 2.5,      // 碰撞半徑（基於節點大小）
  collisionStrength: 0.8,    // 碰撞力度

  // 速度與阻尼
  damping: 0.85,             // 阻尼係數（0-1，越小越快停止）
  maxVelocity: 0.5,          // 最大速度限制
  minVelocity: 0.001,        // 最小速度閾值（低於此值視為靜止）

  // 迭代控制
  initialIterations: 100,    // 初始化時的迭代次數
  stabilityThreshold: 0.01   // 穩定性閾值
}

// 動態計算力導向圖參數（綁定畫布對角線與節點數）
const calculateDynamicForceParams = (nodeCount, canvasSize) => {
  // 計算畫布對角線長度
  const diagonal = Math.sqrt(2) * canvasSize

  // 節點數量因子
  const countFactor = Math.sqrt(nodeCount / 10) // 以10個節點為基準

  // 畫布尺寸因子（相對於基準 1000）
  const sizeFactor = canvasSize / 1000

  return {
    // 斥力與畫布尺寸成正比
    repulsion: FORCE_PARAMS.baseRepulsion * sizeFactor * (1 + countFactor * 0.3),

    // 連線長度約為對角線的 1/5 到 1/3
    linkDistance: (diagonal / 6) * (1 + countFactor * 0.15),

    // 重力隨畫布增大而減小（避免過度聚中心）
    gravity: FORCE_PARAMS.baseGravity / sizeFactor * (1 - countFactor * 0.1),

    // 碰撞半徑隨畫布增大
    collisionRadius: FORCE_PARAMS.collisionRadius * sizeFactor * Math.max(1, countFactor * 0.5),

    // 保存畫布資訊供邊界力使用
    canvasSize,
    diagonal
  }
}

// 工具函數與數學運算
const clamp = (v, min, max) => Math.max(min, Math.min(max, v))

const gridToView = (value) => value * GRID_SCALE

const computeGridOffsets = (point) => ({
  x: Math.round((point.x - GRID_CENTER) / GRID_SPACING),
  y: Math.round((point.y - GRID_CENTER) / GRID_SPACING)
})

const applyGridSpread = (point) => {
  const offsets = computeGridOffsets(point)
  const layer = Math.max(Math.abs(offsets.x), Math.abs(offsets.y))
  if (!layer) {
    return { x: GRID_CENTER, y: GRID_CENTER }
  }
  const spreadMultiplier = BASE_SPREAD_MULTIPLIER / Math.pow(layer, SPREAD_DECAY)
  return {
    x: GRID_CENTER + offsets.x * GRID_SPACING * spreadMultiplier,
    y: GRID_CENTER + offsets.y * GRID_SPACING * spreadMultiplier
  }
}

const isWithinSpreadBounds = (point) => {
  const spread = applyGridSpread(point)
  return (
    spread.x >= GRID_BOUND_MARGIN &&
    spread.x <= GRID_SIZE - GRID_BOUND_MARGIN &&
    spread.y >= GRID_BOUND_MARGIN &&
    spread.y <= GRID_SIZE - GRID_BOUND_MARGIN
  )
}

const generateGridPositions = (count) => {
  const slots = []
  if (count <= 0) {
    return slots
  }

  const seen = new Set()
  const maxLayer = Math.floor((GRID_CENTER - GRID_SPACING) / GRID_SPACING)

  const addSlot = (x, y) => {
    if (slots.length >= count) {
      return
    }
    const slot = { x, y }
    const key = `${x},${y}`
    if (seen.has(key)) {
      return
    }
    seen.add(key)
    const spreadPoint = applyGridSpread(slot)
    const clampedSpread = {
      x: clamp(spreadPoint.x, GRID_BOUND_MARGIN, GRID_SIZE - GRID_BOUND_MARGIN),
      y: clamp(spreadPoint.y, GRID_BOUND_MARGIN, GRID_SIZE - GRID_BOUND_MARGIN)
    }
    slots.push({ ...slot, spread: clampedSpread })
  }

  let layer = 1
  while (slots.length < count && layer <= maxLayer) {
    const offset = layer * GRID_SPACING

    for (let dx = -layer; dx <= layer; dx++) {
      addSlot(GRID_CENTER + dx * GRID_SPACING, GRID_CENTER - offset)
      if (slots.length >= count) return slots
    }

    for (let dy = -layer + 1; dy <= layer; dy++) {
      addSlot(GRID_CENTER + offset, GRID_CENTER + dy * GRID_SPACING)
      if (slots.length >= count) return slots
    }

    for (let dx = layer - 1; dx >= -layer; dx--) {
      addSlot(GRID_CENTER + dx * GRID_SPACING, GRID_CENTER + offset)
      if (slots.length >= count) return slots
    }

    for (let dy = layer - 1; dy >= -layer + 1; dy--) {
      addSlot(GRID_CENTER - offset, GRID_CENTER + dy * GRID_SPACING)
      if (slots.length >= count) return slots
    }

    layer += 1
  }

  while (slots.length < count) {
    const angle = (2 * Math.PI * slots.length) / Math.max(count, 1)
    const radius = Math.min(
      GRID_CENTER - GRID_SPACING,
      GRID_SPACING * (Math.floor(slots.length / 8) + 1)
    )
    const x = GRID_CENTER + Math.cos(angle) * radius
    const y = GRID_CENTER + Math.sin(angle) * radius
    addSlot(
      clamp(Math.round(x / GRID_SPACING) * GRID_SPACING, GRID_SPACING, GRID_SIZE - GRID_SPACING),
      clamp(Math.round(y / GRID_SPACING) * GRID_SPACING, GRID_SPACING, GRID_SIZE - GRID_SPACING)
    )
    if (slots.length >= count) {
      break
    }
  }

  return slots
}

const lerpPoint = (a, b, t) => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t
})

const distanceBetween = (a, b) => Math.hypot(b.x - a.x, b.y - a.y)

const pointOnPolyline = (points, t) => {
  if (!points.length) {
    return { x: 0, y: 0 }
  }
  if (points.length === 1) {
    return points[0]
  }

  const segmentLengths = []
  let totalLength = 0

  for (let i = 0; i < points.length - 1; i++) {
    const length = distanceBetween(points[i], points[i + 1])
    segmentLengths.push(length)
    totalLength += length
  }

  if (totalLength === 0) {
    return points[points.length - 1]
  }

  let remaining = clamp(t, 0, 1) * totalLength

  for (let i = 0; i < segmentLengths.length; i++) {
    const segmentLength = segmentLengths[i]
    if (remaining <= segmentLength) {
      const segmentT = segmentLength === 0 ? 0 : remaining / segmentLength
      return lerpPoint(points[i], points[i + 1], segmentT)
    }
    remaining -= segmentLength
  }

  return points[points.length - 1]
}


// 力導向圖核心計算函數
const calculateForces = (nodes, connections, params) => {
  const forces = new Map()

  // 提取畫布尺寸（避免重複宣告）
  const canvasSize = params.canvasSize || 1000
  const centerX = canvasSize / 2
  const centerY = canvasSize / 2

  // 初始化所有節點的力為零向量
  nodes.forEach(node => {
    forces.set(node.id, { x: 0, y: 0 })
  })

  // 1. 計算節點間斥力（Repulsion Force）
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const nodeA = nodes[i]
      const nodeB = nodes[j]

      // 跳過座標無效的節點
      if (!isFinite(nodeA.x) || !isFinite(nodeA.y) || !isFinite(nodeB.x) || !isFinite(nodeB.y)) {
        continue
      }

      const dx = nodeB.x - nodeA.x
      const dy = nodeB.y - nodeA.y
      const dist = Math.hypot(dx, dy)
      // 防止除以零，如果距離太小或為 NaN，跳過
      if (!isFinite(dist) || dist < 0.1) {
        continue
      }

      // 庫侖斥力：F = k / r²
      const repulsionForce = params.repulsion / (dist * dist)
      const fx = (dx / dist) * repulsionForce
      const fy = (dy / dist) * repulsionForce

      const forceA = forces.get(nodeA.id)
      const forceB = forces.get(nodeB.id)

      forceA.x -= fx
      forceA.y -= fy
      forceB.x += fx
      forceB.y += fy
    }
  }

  // 2. 計算連線引力（Attraction Force）
  const nodeMap = new Map(nodes.map(n => [n.id, n]))

  connections.forEach(conn => {
    const nodeA = nodeMap.get(conn.src)
    const nodeB = nodeMap.get(conn.dst)

    if (!nodeA || !nodeB) return

    // 跳過座標無效的節點
    if (!isFinite(nodeA.x) || !isFinite(nodeA.y) || !isFinite(nodeB.x) || !isFinite(nodeB.y)) {
      return
    }

    const dx = nodeB.x - nodeA.x
    const dy = nodeB.y - nodeA.y
    const dist = Math.hypot(dx, dy)
    if (!isFinite(dist) || dist < 0.1) {
      return
    }

    // 胡克引力：F = k * (r - r0)
    const displacement = dist - params.linkDistance
    const attractionForce = displacement * 0.1 // 彈簧常數
    const fx = (dx / dist) * attractionForce
    const fy = (dy / dist) * attractionForce

    const forceA = forces.get(nodeA.id)
    const forceB = forces.get(nodeB.id)

    forceA.x += fx
    forceA.y += fy
    forceB.x -= fx
    forceB.y -= fy
  })

  // 3. 計算重力（Gravity Force）- 將節點拉向畫面中心
  // 使用動態畫布尺寸的中心，而非固定的 VIEWBOX_SIZE
  nodes.forEach(node => {
    // 跳過中心節點（已固定位置）
    if (node.isCenter) return

    // 跳過座標無效的節點
    if (!isFinite(node.x) || !isFinite(node.y)) {
      return
    }

    const dx = centerX - node.x
    const dy = centerY - node.y
    const dist = Math.hypot(dx, dy)
    if (!isFinite(dist) || dist < 0.1) {
      return
    }

    const gravityForce = params.gravity * dist
    const fx = (dx / dist) * gravityForce
    const fy = (dy / dist) * gravityForce

    const force = forces.get(node.id)
    force.x += fx
    force.y += fy
  })

  // 4. 計算碰撞力（Collision Force）
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const nodeA = nodes[i]
      const nodeB = nodes[j]

      const dx = nodeB.x - nodeA.x
      const dy = nodeB.y - nodeA.y
      const dist = Math.hypot(dx, dy) || 0.1
      const minDist = params.collisionRadius * 2

      if (dist < minDist) {
        const overlap = minDist - dist
        const collisionForce = overlap * FORCE_PARAMS.collisionStrength
        const fx = (dx / dist) * collisionForce
        const fy = (dy / dist) * collisionForce

        const forceA = forces.get(nodeA.id)
        const forceB = forces.get(nodeB.id)

        forceA.x -= fx
        forceA.y -= fy
        forceB.x += fx
        forceB.y += fy
      }
    }
  }

  // 5. 計算矩形邊界回彈力（Boundary Repulsion Force）
  // 防止節點黏在角落或邊緣
  const padding = params.collisionRadius * 3 // 邊界緩衝區
  const boundaryStrength = params.repulsion * 0.5 // 邊界力強度

  nodes.forEach(node => {
    const force = forces.get(node.id)

    // 左邊界
    if (node.x < padding) {
      const dist = Math.max(node.x, 1)
      const pushForce = boundaryStrength / (dist * dist)
      force.x += pushForce
    }

    // 右邊界
    if (node.x > canvasSize - padding) {
      const dist = Math.max(canvasSize - node.x, 1)
      const pushForce = boundaryStrength / (dist * dist)
      force.x -= pushForce
    }

    // 上邊界
    if (node.y < padding) {
      const dist = Math.max(node.y, 1)
      const pushForce = boundaryStrength / (dist * dist)
      force.y += pushForce
    }

    // 下邊界
    if (node.y > canvasSize - padding) {
      const dist = Math.max(canvasSize - node.y, 1)
      const pushForce = boundaryStrength / (dist * dist)
      force.y -= pushForce
    }

    // 角落額外推力（防止節點堆積在四角）
    const cornerRadius = padding * 2
    const corners = [
      { x: 0, y: 0 },                              // 左上
      { x: canvasSize, y: 0 },                     // 右上
      { x: 0, y: canvasSize },                     // 左下
      { x: canvasSize, y: canvasSize }             // 右下
    ]

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

// 應用力並更新節點位置
const applyForces = (nodes, forces, velocities, params) => {
  const updatedNodes = []
  const canvasSize = params.canvasSize || 1000
  const padding = params.collisionRadius * 2

  nodes.forEach(node => {
    // 中心節點保持固定（如果 isCenter 為 true）
    if (node.isCenter) {
      updatedNodes.push({ ...node })
      return
    }

    const force = forces.get(node.id) || { x: 0, y: 0 }
    const velocity = velocities.get(node.id) || { x: 0, y: 0 }

    // 更新速度：v = v + F (假設質量為1)
    velocity.x = (velocity.x + force.x) * params.damping
    velocity.y = (velocity.y + force.y) * params.damping

    // 限制最大速度（根據畫布大小調整）
    const maxVel = params.maxVelocity * (canvasSize / 1000)
    const speed = Math.hypot(velocity.x, velocity.y)
    if (speed > maxVel) {
      velocity.x = (velocity.x / speed) * maxVel
      velocity.y = (velocity.y / speed) * maxVel
    }

    // 更新位置（添加 NaN 防護）
    let newX = node.x + velocity.x
    let newY = node.y + velocity.y

    // 防止 NaN 傳播：如果座標無效，重置為畫布中心
    if (!isFinite(newX) || !isFinite(newY)) {
      newX = canvasSize / 2
      newY = canvasSize / 2
      // 同時重置速度
      velocity.x = 0
      velocity.y = 0
    }

    // 邊界限制（使用動態畫布尺寸）
    newX = clamp(newX, padding, canvasSize - padding)
    newY = clamp(newY, padding, canvasSize - padding)

    velocities.set(node.id, velocity)

    updatedNodes.push({
      ...node,
      x: newX,
      y: newY
    })
  })

  return updatedNodes
}

const parseTimelineId = (timeline) => {
  if (!timeline?.id) {
    return null
  }

  // Timeline ID 格式可能是：
  // 1. "tcp-teardown-10.128.0.2-5416-10.0.0.2-80" (帶子類型)
  // 2. "tcp-10.128.0.2-5416-10.0.0.2-80" (純協議)
  // 使用正則表達式提取 IP 和 Port
  const ipPortPattern = /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})-(\d+)-(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})-(\d+)$/
  const match = timeline.id.match(ipPortPattern)

  if (!match) {
    return null
  }

  const [, srcIp, srcPort, dstIp, dstPort] = match

  // 提取協議類型（IP 之前的部分）
  const protocolPart = timeline.id.replace(ipPortPattern, '').replace(/-$/, '')

  return {
    protocol: protocolPart,
    protocolType: timeline.protocolType || protocolPart,
    src: { ip: srcIp, port: srcPort },
    dst: { ip: dstIp, port: dstPort }
  }
}

// 使用力導向圖算法初始化節點布局（協議分艙極座標播種）
const buildNodeLayout = (timelines, canvasSize = 1000) => {
  const endpoints = new Map()
  const connectionCounts = new Map()

  timelines.forEach((timeline) => {
    const parsed = parseTimelineId(timeline)
    if (!parsed) {
      return
    }

    const addEndpoint = ({ ip, port }, protocol) => {
      if (!ip) {
        return
      }
      const existing = endpoints.get(ip) || {
        id: ip,
        ip,
        ports: new Set(),
        protocols: new Set()
      }
      if (port) {
        existing.ports.add(port)
      }
      if (protocol) {
        existing.protocols.add(protocol.toUpperCase())
      }
      endpoints.set(ip, existing)

      // 計算連線數
      connectionCounts.set(ip, (connectionCounts.get(ip) || 0) + 1)
    }

    addEndpoint(parsed.src, timeline.protocol)
    addEndpoint(parsed.dst, timeline.protocol)
  })

  const nodes = Array.from(endpoints.values())

  if (nodes.length === 0) {
    return []
  }

  // 找出連線數最多的節點作為中心
  let centerNode = nodes[0]
  let maxConnections = 0
  nodes.forEach(node => {
    const count = connectionCounts.get(node.ip) || 0
    if (count > maxConnections) {
      maxConnections = count
      centerNode = node
    }
  })

  // 協議分艙（Protocol Clustering）
  const protocolGroups = {}
  nodes.forEach(node => {
    const primaryProtocol = Array.from(node.protocols)[0] || 'OTHER'
    if (!protocolGroups[primaryProtocol]) {
      protocolGroups[primaryProtocol] = []
    }
    protocolGroups[primaryProtocol].push(node)
  })

  const protocols = Object.keys(protocolGroups)
  const protocolCount = protocols.length

  // 極座標播種（Polar Coordinate Seeding）
  const centerX = canvasSize / 2
  const centerY = canvasSize / 2
  const baseRadius = canvasSize * 0.4 // 基礎半徑為畫布的 40%（增加分散度）

  const initialNodes = []
  let globalIndex = 0

  protocols.forEach((protocol, protocolIndex) => {
    const protocolNodes = protocolGroups[protocol]
    const protocolAngleStart = (2 * Math.PI * protocolIndex) / protocolCount
    const protocolAngleRange = (2 * Math.PI) / protocolCount
    const nodesInProtocol = protocolNodes.length

    protocolNodes.forEach((node, nodeIndex) => {
      const isCenter = node.id === centerNode?.id

      let x, y

      if (isCenter) {
        // 中心節點固定在畫面正中央
        x = centerX
        y = centerY
      } else {
        // 在協議分艙內使用極座標分布
        const angleOffset = protocolAngleStart + (protocolAngleRange * nodeIndex) / Math.max(nodesInProtocol, 1)
        // 增加半徑變化範圍，形成多層環狀分布（50%-150%）
        const radiusVariation = 0.5 + Math.random() * 1.0
        const radius = baseRadius * radiusVariation

        x = centerX + Math.cos(angleOffset) * radius
        y = centerY + Math.sin(angleOffset) * radius

        // 確保在邊界內（使用動態畫布尺寸）
        const padding = 50
        x = clamp(x, padding, canvasSize - padding)
        y = clamp(y, padding, canvasSize - padding)
      }

      initialNodes.push({
        id: node.id,
        label: node.ip,
        ports: Array.from(node.ports),
        protocols: Array.from(node.protocols),
        x,
        y,
        isCenter,
        connectionCount: connectionCounts.get(node.ip) || 0,
        primaryProtocol: Array.from(node.protocols)[0] || 'OTHER'
      })

      globalIndex++
    })
  })

  // 建立連線資訊供力導向圖使用
  const connections = []
  timelines.forEach((timeline) => {
    const parsed = parseTimelineId(timeline)
    if (parsed && parsed.src?.ip && parsed.dst?.ip) {
      connections.push({
        src: parsed.src.ip,
        dst: parsed.dst.ip
      })
    }
  })

  // 動態計算力導向圖參數（綁定畫布尺寸）
  const forceParams = calculateDynamicForceParams(nodes.length, canvasSize)
  const params = {
    ...FORCE_PARAMS,
    ...forceParams
  }

  // 執行初始力導向圖迭代以穩定布局
  let currentNodes = initialNodes
  const velocities = new Map()

  // 初始化速度為零
  currentNodes.forEach(node => {
    velocities.set(node.id, { x: 0, y: 0 })
  })

  // 執行固定次數的迭代
  for (let iter = 0; iter < params.initialIterations; iter++) {
    const forces = calculateForces(currentNodes, connections, params)
    currentNodes = applyForces(currentNodes, forces, velocities, params)
  }

  return currentNodes
}


const buildConnections = (timelines) => {
  const connections = []
  const groups = new Map()

  timelines.forEach((timeline, index) => {
    const parsed = parseTimelineId(timeline)
    if (!parsed) {
      return
    }

    const connection = {
      id: `${timeline.id}-${index}`, // 添加索引確保唯一性
      originalId: timeline.id, // 保留原始 ID 供其他用途
      protocol: timeline.protocol,
      protocolType: timeline.protocolType, // 保留協議類型供動畫使用
      stages: timeline.stages,
      metrics: timeline.metrics,
      src: parsed.src.ip,
      dst: parsed.dst.ip,
      bundleIndex: 0,
      bundleSize: 1
    }

    const key = `${parsed.src.ip}->${parsed.dst.ip}`
    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key).push(connection)
    connections.push(connection)
  })

  groups.forEach((list) => {
    const centerIndex = (list.length - 1) / 2
    list.forEach((connection, index) => {
      connection.bundleIndex = index
      connection.bundleSize = list.length
      connection.bundleOffset = index - centerIndex
    })
  })

  return connections
}

/**
 * 建立合併後的連線（遠景模式用）
 * 將相同節點對之間的多條連線合併為單一視覺連線
 */
const buildAggregatedConnections = (timelines) => {
  const aggregatedMap = new Map()

  timelines.forEach((timeline, index) => {
    const parsed = parseTimelineId(timeline)
    if (!parsed) {
      return
    }

    // 使用節點對作為 key（忽略端口，只看 IP）
    const nodeKey = `${parsed.src.ip}<->${parsed.dst.ip}`

    if (!aggregatedMap.has(nodeKey)) {
      // 創建新的合併連線
      aggregatedMap.set(nodeKey, {
        id: `aggregated-${nodeKey}`,
        src: parsed.src.ip,
        dst: parsed.dst.ip,
        connections: [], // 所有原始連線
        protocols: new Set(), // 使用的協議類型
        totalPackets: 0,
        totalBytes: 0,
        connectionCount: 0
      })
    }

    const aggregated = aggregatedMap.get(nodeKey)

    // 添加原始連線引用
    aggregated.connections.push({
      id: `${timeline.id}-${index}`,
      originalId: timeline.id,
      protocol: timeline.protocol,
      protocolType: timeline.protocolType,
      stages: timeline.stages,
      metrics: timeline.metrics
    })

    // 累計統計資訊
    aggregated.protocols.add(timeline.protocol)
    aggregated.connectionCount++

    // 累計封包和流量（如果有 metrics）
    if (timeline.metrics) {
      aggregated.totalPackets += timeline.metrics.packetCount || 0
      aggregated.totalBytes += timeline.metrics.totalBytes || 0
    }
  })

  // 轉換為數組並計算視覺屬性
  const connections = Array.from(aggregatedMap.values()).map(agg => ({
    ...agg,
    protocols: Array.from(agg.protocols),
    // 計算線條粗細（基於連線數量，範圍 1-10）
    strokeWidth: Math.min(1 + Math.log10(agg.connectionCount) * 2, 10),
    // 主要協議（使用最多的協議）
    primaryProtocol: agg.connections[0].protocol,
    primaryProtocolType: agg.connections[0].protocolType,
    // 使用第一條子連線的 originalId 來獲取 renderState（修復遠景顯示 ?? 問題）
    originalId: agg.connections[0].originalId
  }))

  const stats = {
    original: timelines.length,
    aggregated: connections.length,
    reduction: ((1 - connections.length / timelines.length) * 100).toFixed(1) + '%',
    sample: connections.slice(0, 3).map(c => ({
      id: c.id,
      src: c.src,
      dst: c.dst,
      count: c.connectionCount
    }))
  }

  return connections
}

const protocolColor = (protocol, protocolType) => {
  // 優先使用協議類型的顏色
  if (protocolType) {
    const typeColor = PROTOCOL_COLORS[protocolType] || getProtocolColor(protocolType)
    if (typeColor) return typeColor
  }
  
  // 回退到基本協議顏色
  return PROTOCOL_COLORS[protocol?.toLowerCase()] || '#94a3b8'
}

export default function MindMap() {
  const [timelines, setTimelines] = useState([])
  const [sourceFiles, setSourceFiles] = useState([])
  const [generatedAt, setGeneratedAt] = useState(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const [attackAnalysis, setAttackAnalysis] = useState(null) // 攻擊分析數據
  const controllersRef = useRef(new Map())
  const [renderStates, setRenderStates] = useState({})
  const rafRef = useRef(null)
  const lastTickRef = useRef(performance.now())
  const fileInputRef = useRef(null)

  // 視圖與節點拖曳狀態
  const svgRef = useRef(null)
  const [viewTransform, setViewTransform] = useState({ scale: 1, tx: 0, ty: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const panStartRef = useRef({ x: 0, y: 0 })
  const [nodePositions, setNodePositions] = useState({})
  const [draggingNodeId, setDraggingNodeId] = useState(null)

  // 地圖式交互狀態
  const [inertiaVelocity, setInertiaVelocity] = useState({ vx: 0, vy: 0 })
  const lastPanMoveRef = useRef({ x: 0, y: 0, time: 0 })
  const inertiaAnimationRef = useRef(null)
  const [touchState, setTouchState] = useState({
    active: false,
    initialDistance: 0,
    initialScale: 1,
    center: { x: 0, y: 0 }
  })

  // 互動狀態: 漸進式資訊揭露
  const [hoveredConnectionId, setHoveredConnectionId] = useState(null)
  const [selectedConnectionId, setSelectedConnectionId] = useState(null)
  const selectedConnectionIdRef = useRef(null) // 用於動畫循環訪問最新值
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  const [connectionPackets, setConnectionPackets] = useState(null)
  const [loadingPackets, setLoadingPackets] = useState(false)

  // 批量封包檢視器狀態
  const [showBatchViewer, setShowBatchViewer] = useState(false)
  const [batchViewerConnection, setBatchViewerConnection] = useState(null)

  // 智能判斷是否為攻擊流量
  // 規則：connectionCount > 50 視為攻擊流量，使用 FloodParticleSystem + 攻擊時間軸
  // 否則視為正常流量，使用 PacketParticleSystem + 封包列表
  const isAttackTraffic = useMemo(() => {
    if (!batchViewerConnection) return false
    return batchViewerConnection.connectionCount > 50
  }, [batchViewerConnection])

  // 洪流粒子效果狀態
  const [floodStatistics, setFloodStatistics] = useState(null)
  const [floodTimeProgress, setFloodTimeProgress] = useState(0)
  const [floodIntensity, setFloodIntensity] = useState(0) // 當前攻擊強度 (0-1)
  const floodAnimationRef = useRef(null)

  // 處理強度變化回調（節流以避免過多 re-render）
  const lastIntensityUpdateRef = useRef(0)
  const handleFloodIntensityChange = useCallback((intensity) => {
    const now = Date.now()
    // 每 50ms 最多更新一次
    if (now - lastIntensityUpdateRef.current > 50) {
      setFloodIntensity(intensity)
      lastIntensityUpdateRef.current = now
    }
  }, [])

  // 同步 selectedConnectionId 到 ref，讓動畫循環能訪問最新值
  useEffect(() => {
    selectedConnectionIdRef.current = selectedConnectionId
  }, [selectedConnectionId])

  // 粒子系統狀態
  const particleSystemRef = useRef(null)
  const [particleSpeed, setParticleSpeed] = useState(1.0)
  const [isParticleAnimationPlaying, setIsParticleAnimationPlaying] = useState(true)
  const [particleTimeInfo, setParticleTimeInfo] = useState({ current: '0.00', total: '0.00', progress: 0 })

  // 粒子與側邊欄互動狀態
  const [activeParticleIndices, setActiveParticleIndices] = useState(new Set()) // 當前顯示的粒子索引
  const [selectedPacketIndex, setSelectedPacketIndex] = useState(null) // 使用者點選的封包索引

  // 全局時間軸狀態（統一控制所有動畫）
  const globalTimeRef = useRef(0) // 當前全局時間（毫秒）- 使用 ref 避免觸發重新渲染
  const [globalDuration, setGlobalDuration] = useState(0) // 全局總時長（毫秒）
  const globalStartTimestamp = useRef(0) // 最早的封包時間戳（秒）
  const globalEndTimestamp = useRef(0) // 最晚的封包時間戳（秒）
  const [isGlobalPlaying, setIsGlobalPlaying] = useState(true) // 全局播放狀態
  const [globalSpeed, setGlobalSpeed] = useState(1.0) // 全局播放速度
  const [globalTimeDisplay, setGlobalTimeDisplay] = useState(0) // 用於 UI 顯示的全局時間（降低更新頻率）

  // 動畫控制狀態
  const [isPaused, setIsPaused] = useState(false)
  const [isFocusMode, setIsFocusMode] = useState(false)

  // 力導向圖狀態
  const velocitiesRef = useRef(new Map())
  const forceSimulationRef = useRef(null)
  const [isLayoutStable, setIsLayoutStable] = useState(false)

  // 動態畫布尺寸
  const [canvasSize, setCanvasSize] = useState(1000)

  // Fit-to-View 狀態
  const [needsFitToView, setNeedsFitToView] = useState(false)

  const toWorldCoords = useCallback((clientX, clientY) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    const svgX = (clientX - rect.left) / rect.width * VIEWBOX_SIZE
    const svgY = (clientY - rect.top) / rect.height * VIEWBOX_SIZE
    return {
      x: (svgX - viewTransform.tx) / viewTransform.scale,
      y: (svgY - viewTransform.ty) / viewTransform.scale
    }
  }, [viewTransform])

  const handleWheelZoom = useCallback((e) => {
    e.preventDefault()

    // 停止慣性動畫
    if (inertiaAnimationRef.current) {
      cancelAnimationFrame(inertiaAnimationRef.current)
      inertiaAnimationRef.current = null
      setInertiaVelocity({ vx: 0, vy: 0 })
    }

    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return

    // 計算滑鼠在 SVG 中的位置
    const mouseX = (e.clientX - rect.left) / rect.width * canvasSize
    const mouseY = (e.clientY - rect.top) / rect.height * canvasSize

    const direction = e.deltaY > 0 ? -1 : 1
    const factor = 1 + direction * 0.1

    setViewTransform(prev => {
      const newScale = clamp(prev.scale * factor, 0.2, 5)

      // 計算縮放前後滑鼠在世界座標中的位置
      const worldXBefore = (mouseX - prev.tx) / prev.scale
      const worldYBefore = (mouseY - prev.ty) / prev.scale

      // 計算新的平移量，使得滑鼠位置保持不變
      const newTx = mouseX - worldXBefore * newScale
      const newTy = mouseY - worldYBefore * newScale

      return {
        scale: newScale,
        tx: newTx,
        ty: newTy
      }
    })
  }, [canvasSize])

  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return

    // 停止慣性動畫
    if (inertiaAnimationRef.current) {
      cancelAnimationFrame(inertiaAnimationRef.current)
      inertiaAnimationRef.current = null
    }

    setIsPanning(true)
    setInertiaVelocity({ vx: 0, vy: 0 })
    panStartRef.current = { x: e.clientX, y: e.clientY }
    lastPanMoveRef.current = { x: e.clientX, y: e.clientY, time: performance.now() }
  }, [])

  const handleMouseMove = useCallback((e) => {
    if (draggingNodeId) {
      const world = toWorldCoords(e.clientX, e.clientY)
      setNodePositions(prev => ({
        ...prev,
        [draggingNodeId]: {
          x: clamp(world.x, VIEWBOX_PADDING, canvasSize - VIEWBOX_PADDING),
          y: clamp(world.y, VIEWBOX_PADDING, canvasSize - VIEWBOX_PADDING)
        }
      }))
      return
    }
    if (!isPanning) return

    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return

    const currentTime = performance.now()
    const dx = e.clientX - panStartRef.current.x
    const dy = e.clientY - panStartRef.current.y

    // 計算速度（用於慣性效果）
    const dt = currentTime - lastPanMoveRef.current.time
    if (dt > 0) {
      const vx = (e.clientX - lastPanMoveRef.current.x) / dt
      const vy = (e.clientY - lastPanMoveRef.current.y) / dt
      setInertiaVelocity({ vx, vy })
    }

    lastPanMoveRef.current = { x: e.clientX, y: e.clientY, time: currentTime }
    panStartRef.current = { x: e.clientX, y: e.clientY }

    const deltaX = dx / rect.width * canvasSize
    const deltaY = dy / rect.height * canvasSize
    setViewTransform(prev => ({ ...prev, tx: prev.tx + deltaX, ty: prev.ty + deltaY }))
  }, [isPanning, draggingNodeId, toWorldCoords, canvasSize])

  const handleMouseUp = useCallback(() => {
    if (isPanning && !draggingNodeId) {
      // 啟動慣性動畫
      const startInertia = () => {
        const FRICTION = 0.95 // 摩擦係數
        const MIN_VELOCITY = 0.001 // 最小速度閾值

        const animate = () => {
          setInertiaVelocity(prev => {
            const newVx = prev.vx * FRICTION
            const newVy = prev.vy * FRICTION

            // 速度太小時停止動畫
            if (Math.abs(newVx) < MIN_VELOCITY && Math.abs(newVy) < MIN_VELOCITY) {
              inertiaAnimationRef.current = null
              return { vx: 0, vy: 0 }
            }

            // 更新視圖位置
            setViewTransform(current => {
              const rect = svgRef.current?.getBoundingClientRect()
              if (!rect) return current

              const deltaX = (newVx * 16) / rect.width * canvasSize
              const deltaY = (newVy * 16) / rect.height * canvasSize

              return {
                ...current,
                tx: current.tx + deltaX,
                ty: current.ty + deltaY
              }
            })

            inertiaAnimationRef.current = requestAnimationFrame(animate)
            return { vx: newVx, vy: newVy }
          })
        }

        inertiaAnimationRef.current = requestAnimationFrame(animate)
      }

      startInertia()
    }

    setIsPanning(false)
    setDraggingNodeId(null)
  }, [isPanning, draggingNodeId, canvasSize])

  // 觸控手勢處理
  const handleTouchStart = useCallback((e) => {
    if (e.touches.length === 2) {
      // 雙指觸控：縮放
      e.preventDefault()

      // 停止慣性動畫
      if (inertiaAnimationRef.current) {
        cancelAnimationFrame(inertiaAnimationRef.current)
        inertiaAnimationRef.current = null
        setInertiaVelocity({ vx: 0, vy: 0 })
      }

      const touch1 = e.touches[0]
      const touch2 = e.touches[1]

      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      )

      const centerX = (touch1.clientX + touch2.clientX) / 2
      const centerY = (touch1.clientY + touch2.clientY) / 2

      setTouchState({
        active: true,
        initialDistance: distance,
        initialScale: viewTransform.scale,
        center: { x: centerX, y: centerY }
      })
    } else if (e.touches.length === 1) {
      // 單指觸控：平移
      const touch = e.touches[0]
      panStartRef.current = { x: touch.clientX, y: touch.clientY }
      lastPanMoveRef.current = { x: touch.clientX, y: touch.clientY, time: performance.now() }
      setIsPanning(true)
    }
  }, [viewTransform.scale])

  const handleTouchMove = useCallback((e) => {
    if (e.touches.length === 2 && touchState.active) {
      // 雙指縮放
      e.preventDefault()

      const touch1 = e.touches[0]
      const touch2 = e.touches[1]

      const currentDistance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      )

      const scale = (currentDistance / touchState.initialDistance) * touchState.initialScale
      const newScale = clamp(scale, 0.2, 5)

      const rect = svgRef.current?.getBoundingClientRect()
      if (!rect) return

      // 計算觸控中心在 SVG 中的位置
      const centerX = (touch1.clientX + touch2.clientX) / 2
      const centerY = (touch1.clientY + touch2.clientY) / 2
      const svgX = (centerX - rect.left) / rect.width * canvasSize
      const svgY = (centerY - rect.top) / rect.height * canvasSize

      setViewTransform(prev => {
        const worldX = (svgX - prev.tx) / prev.scale
        const worldY = (svgY - prev.ty) / prev.scale

        const newTx = svgX - worldX * newScale
        const newTy = svgY - worldY * newScale

        return {
          scale: newScale,
          tx: newTx,
          ty: newTy
        }
      })
    } else if (e.touches.length === 1 && isPanning) {
      // 單指平移
      const touch = e.touches[0]
      const rect = svgRef.current?.getBoundingClientRect()
      if (!rect) return

      const currentTime = performance.now()
      const dx = touch.clientX - panStartRef.current.x
      const dy = touch.clientY - panStartRef.current.y

      // 計算速度
      const dt = currentTime - lastPanMoveRef.current.time
      if (dt > 0) {
        const vx = (touch.clientX - lastPanMoveRef.current.x) / dt
        const vy = (touch.clientY - lastPanMoveRef.current.y) / dt
        setInertiaVelocity({ vx, vy })
      }

      lastPanMoveRef.current = { x: touch.clientX, y: touch.clientY, time: currentTime }
      panStartRef.current = { x: touch.clientX, y: touch.clientY }

      const deltaX = dx / rect.width * canvasSize
      const deltaY = dy / rect.height * canvasSize
      setViewTransform(prev => ({ ...prev, tx: prev.tx + deltaX, ty: prev.ty + deltaY }))
    }
  }, [touchState, isPanning, canvasSize])

  const handleTouchEnd = useCallback((e) => {
    if (e.touches.length === 0) {
      // 所有觸控點都釋放
      if (isPanning) {
        // 啟動慣性動畫（與滑鼠相同）
        const FRICTION = 0.95
        const MIN_VELOCITY = 0.001

        const animate = () => {
          setInertiaVelocity(prev => {
            const newVx = prev.vx * FRICTION
            const newVy = prev.vy * FRICTION

            if (Math.abs(newVx) < MIN_VELOCITY && Math.abs(newVy) < MIN_VELOCITY) {
              inertiaAnimationRef.current = null
              return { vx: 0, vy: 0 }
            }

            setViewTransform(current => {
              const rect = svgRef.current?.getBoundingClientRect()
              if (!rect) return current

              const deltaX = (newVx * 16) / rect.width * canvasSize
              const deltaY = (newVy * 16) / rect.height * canvasSize

              return {
                ...current,
                tx: current.tx + deltaX,
                ty: current.ty + deltaY
              }
            })

            inertiaAnimationRef.current = requestAnimationFrame(animate)
            return { vx: newVx, vy: newVy }
          })
        }

        inertiaAnimationRef.current = requestAnimationFrame(animate)
      }

      setIsPanning(false)
      setTouchState({
        active: false,
        initialDistance: 0,
        initialScale: 1,
        center: { x: 0, y: 0 }
      })
    } else if (e.touches.length < 2) {
      // 從雙指變為單指
      setTouchState({
        active: false,
        initialDistance: 0,
        initialScale: 1,
        center: { x: 0, y: 0 }
      })
    }
  }, [isPanning, canvasSize])

  // Fit-to-View：自動縮放與置中
  const fitToView = useCallback((nodes) => {
    if (!nodes || nodes.length === 0) return

    // 計算所有節點的邊界框
    let minX = Infinity, minY = Infinity
    let maxX = -Infinity, maxY = -Infinity

    nodes.forEach(node => {
      minX = Math.min(minX, node.x)
      minY = Math.min(minY, node.y)
      maxX = Math.max(maxX, node.x)
      maxY = Math.max(maxY, node.y)
    })

    // 計算邊界框尺寸
    const width = maxX - minX
    const height = maxY - minY
    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2

    // 計算視窗尺寸（假設 SVG 容器佔滿可用空間）
    const containerWidth = svgRef.current?.clientWidth || 800
    const containerHeight = svgRef.current?.clientHeight || 600

    // 計算縮放比例（保留 10% 邊距）
    const scaleX = (containerWidth * 0.9) / width
    const scaleY = (containerHeight * 0.9) / height
    const scale = Math.min(scaleX, scaleY, 3) // 限制最大縮放為 3

    // 計算平移量（將中心點移到視窗中心）
    const viewCenterX = canvasSize / 2
    const viewCenterY = canvasSize / 2
    const tx = viewCenterX - centerX
    const ty = viewCenterY - centerY

    setViewTransform({ scale, tx, ty })
  }, [canvasSize])

  // 重置視圖
  const resetView = useCallback(() => {
    setViewTransform({ scale: 1, tx: 0, ty: 0 })
  }, [])

  const loadTimelines = useCallback(async () => {
    setLoading(true)
    setError(null)

    const fetchCandidate = async (url) => {
      try {
        const response = await fetch(url, { cache: 'no-store' })
        if (!response.ok) {
          return null
        }
        return await response.json()
      } catch (err) {
        return null
      }
    }

    let payload = null

    if (ANALYZER_API_ENABLED) {
      const apiPayload = await fetchCandidate(API_TIMELINES_URL)
      if (apiPayload?.timelines?.length) {
        payload = apiPayload
      }
    }

    if (!payload) {
      payload = await fetchCandidate(STATIC_TIMELINES_URL)
    }

    if (!payload || !Array.isArray(payload.timelines)) {
      setError('????????????????????????')
      setTimelines([])
      setSourceFiles([])
      setGeneratedAt(null)
      setLoading(false)
      return
    }

    setTimelines(payload.timelines)
    setSourceFiles(payload.sourceFiles || [])
    setGeneratedAt(payload.generatedAt || null)
    setAttackAnalysis(payload.attackAnalysis || null) // 提取攻擊分析數據
    setLoading(false)
  }, [])

  useEffect(() => {
    loadTimelines()
  }, [loadTimelines])

  // 計算全局時間範圍（從所有 timelines 中提取最早和最晚的時間戳）
  useEffect(() => {
    if (!timelines.length) {
      globalStartTimestamp.current = 0
      globalEndTimestamp.current = 0
      setGlobalDuration(0)
      return
    }

    let minTime = Infinity
    let maxTime = -Infinity

    timelines.forEach(timeline => {
      if (timeline.stages && Array.isArray(timeline.stages)) {
        timeline.stages.forEach(stage => {
          if (stage.startTime !== undefined) {
            minTime = Math.min(minTime, stage.startTime)
          }
          if (stage.endTime !== undefined) {
            maxTime = Math.max(maxTime, stage.endTime)
          }
        })
      }
    })

    // 如果沒有有效的時間範圍，設置默認值
    if (minTime === Infinity || maxTime === -Infinity) {
      globalStartTimestamp.current = 0
      globalEndTimestamp.current = 10
      setGlobalDuration(10000) // 10 秒默認
    } else {
      globalStartTimestamp.current = minTime
      globalEndTimestamp.current = maxTime
      const duration = (maxTime - minTime) * 1000 // 轉換為毫秒
      setGlobalDuration(duration > 0 ? duration : 1000)
    }

    // 重置全局時間到起點
    globalTimeRef.current = 0
    setGlobalTimeDisplay(0)
  }, [timelines])

  useEffect(() => {
    if (!timelines.length) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      return
    }

    lastTickRef.current = performance.now()

    const tick = (timestamp) => {
      const delta = timestamp - lastTickRef.current
      lastTickRef.current = timestamp

      // 更新全局時間（統一時間軸）- 使用 ref 避免觸發重新渲染
      if (isGlobalPlaying && !isPaused && globalDuration > 0) {
        globalTimeRef.current += delta * globalSpeed
        // 循環播放
        while (globalTimeRef.current >= globalDuration) {
          globalTimeRef.current -= globalDuration
        }
        while (globalTimeRef.current < 0) {
          globalTimeRef.current += globalDuration
        }

        // 每 10 幀更新一次 UI 顯示（降低更新頻率）
        if (Math.random() < 0.1) {
          setGlobalTimeDisplay(globalTimeRef.current)
        }
      }

      // 更新粒子系統（使用全局時間同步）
      if (particleSystemRef.current && selectedConnectionIdRef.current && globalDuration > 0) {
        // 使用全局時間來更新粒子系統（同步模式）
        // 傳遞全局時間和全局時長，讓粒子系統根據進度計算本地時間
        particleSystemRef.current.setGlobalTime(
          globalTimeRef.current,
          globalDuration
        )

        // 更新時間資訊以觸發 UI 重新渲染（降低頻率）
        const timeInfo = particleSystemRef.current.getTimeInfo()
        const globalProgress = globalDuration > 0 ? globalTimeRef.current / globalDuration : 0

        // 降低 UI 更新頻率
        if (Math.random() < 0.1) {
          setParticleTimeInfo({
            current: (globalTimeRef.current / 1000).toFixed(2),
            total: (globalDuration / 1000).toFixed(2),
            progress: globalProgress
          })
        }

        // 更新活躍粒子索引（用於側邊欄高亮同步）- 每幀都更新確保同步
        const activeParticles = particleSystemRef.current.getActiveParticles()
        const newActiveIndices = new Set(activeParticles.map(p => p.index))
        // 只在有變化時更新，避免不必要的渲染
        if (newActiveIndices.size > 0 || activeParticleIndices.size > 0) {
          const currentIndicesArray = [...activeParticleIndices].sort()
          const newIndicesArray = [...newActiveIndices].sort()
          const hasChanged = currentIndicesArray.length !== newIndicesArray.length ||
            currentIndicesArray.some((v, i) => v !== newIndicesArray[i])
          if (hasChanged) {
            setActiveParticleIndices(newActiveIndices)
          }
        }
      }

      // 更新遠景動畫 controllers（循環播放）
      if (!isPaused && timelines.length > 0) {
        // 確保所有連線都有 controller
        timelines.forEach(timeline => {
          if (!controllersRef.current.has(timeline.id)) {
            const controller = new ProtocolAnimationController(timeline)
            controller.reset()
            controllersRef.current.set(timeline.id, controller)
          }
        })

        // 更新所有 controllers（循環模式）
        const newRenderStates = {}
        controllersRef.current.forEach((controller, id) => {
          // 推進動畫
          controller.advance(delta)

          // 檢查是否完成，如果完成則重置（循環播放）
          if (controller.isCompleted) {
            controller.reset()
          }

          // 獲取渲染狀態
          newRenderStates[id] = controller.getRenderableState()
        })

        setRenderStates(newRenderStates)
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
    }
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [timelines, isPaused, isGlobalPlaying, globalSpeed, globalDuration])

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    // 移除環境變數檢查，直接嘗試上傳
    // 如果後端不可用，會在 catch 區塊處理錯誤

    setUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(API_ANALYZE_URL, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`分析失敗 (${response.status}): ${errorText || '未知錯誤'}`)
      }

      const payload = await response.json()
      const timelinePayload = payload?.analysis?.protocol_timelines

      if (timelinePayload?.timelines?.length) {
        setTimelines(timelinePayload.timelines)
        setSourceFiles(timelinePayload.sourceFiles || [file.name])
        setGeneratedAt(timelinePayload.generatedAt || new Date().toISOString())
      } else {
        await loadTimelines()
      }
    } catch (err) {
      console.error('上傳失敗:', err)
      setError(err?.message || '上傳封包檔案失敗，請確認後端服務是否正常運行')
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  // 獲取連線的封包詳細資訊
  const fetchConnectionPackets = async (connectionId) => {
    if (!connectionId) {
      setConnectionPackets(null)
      return
    }

    setLoadingPackets(true)
    try {
      const response = await fetch(`/api/packets/${encodeURIComponent(connectionId)}`)
      if (!response.ok) {
        throw new Error(`無法取得封包資訊 (${response.status})`)
      }
      const data = await response.json()
      // 保存完整的資料物件（PacketViewer 需要 connection_id 等資訊）
      setConnectionPackets(data)
    } catch (err) {
      console.error('獲取封包資訊失敗:', err)
      setError(err?.message || '無法載入封包資訊')
      setConnectionPackets(null)
    } finally {
      setLoadingPackets(false)
    }
  }

  // 獲取批量封包資料（用於攻擊流量的近景動畫）
  const fetchBatchPacketsForAnimation = async (connection) => {
    if (!connection?.connections) {
      return
    }

    const connectionIds = connection.connections
      .slice(0, 100) // 最多取 100 條連線
      .map(c => c.originalId)

    setLoadingPackets(true)
    try {
      const response = await fetch('/api/packets/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          connection_ids: connectionIds,
          packets_per_connection: 5 // 每條連線取 5 個封包
        })
      })

      if (!response.ok) {
        throw new Error(`無法取得批量封包 (${response.status})`)
      }

      const data = await response.json()

      // 合併所有連線的封包為單一陣列
      const allPackets = []
      Object.values(data.results || {}).forEach(connData => {
        if (connData.packets) {
          allPackets.push(...connData.packets)
        }
      })

      // 按時間戳排序
      allPackets.sort((a, b) => a.timestamp - b.timestamp)

      // 分配全局唯一索引（用於動畫粒子與側邊欄同步）
      allPackets.forEach((packet, idx) => {
        packet.index = idx
      })

      console.log(`[MindMap] Loaded ${allPackets.length} packets from ${Object.keys(data.results || {}).length} connections for animation`)

      // 設置合併後的封包資料
      setConnectionPackets({
        connection_id: connection.id,
        total_packets: allPackets.length,
        packets: allPackets,
        isBatchData: true // 標記為批量資料
      })
    } catch (err) {
      console.error('獲取批量封包失敗:', err)
      setConnectionPackets(null)
    } finally {
      setLoadingPackets(false)
    }
  }

  // 載入洪流粒子效果統計資料
  const fetchFloodStatistics = async (connection) => {
    if (!connection?.connections) {
      setFloodStatistics(null)
      return
    }

    const connectionIds = connection.connections.map(c => c.originalId)

    try {
      const response = await fetch('/api/packets/statistics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          connection_ids: connectionIds,
          time_bucket_ms: 50
        })
      })

      if (!response.ok) {
        throw new Error("Failed to load flood statistics")
      }

      const data = await response.json()
      setFloodStatistics(data)

      // 啟動時間進度動畫
      startFloodAnimation(data.summary?.duration_seconds || 10)
    } catch (err) {
      console.error('[MindMap] Failed to load flood statistics:', err)
      setFloodStatistics(null)
    }
  }

  // 洪流動畫時間進度
  const startFloodAnimation = (durationSeconds) => {
    // 取消舊動畫
    if (floodAnimationRef.current) {
      cancelAnimationFrame(floodAnimationRef.current)
    }

    const startTime = Date.now()
    // 動畫循環時長：使用實際時長但加速播放（最長 30 秒循環）
    const animationDuration = Math.min(durationSeconds * 1000, 30000)

    const animate = () => {
      const elapsed = (Date.now() - startTime) % animationDuration
      const progress = elapsed / animationDuration
      setFloodTimeProgress(progress)
      floodAnimationRef.current = requestAnimationFrame(animate)
    }

    floodAnimationRef.current = requestAnimationFrame(animate)
  }

  // 當選擇聚合連線時載入洪流統計
  useEffect(() => {
    if (showBatchViewer && batchViewerConnection) {
      fetchFloodStatistics(batchViewerConnection)
    } else {
      // 清理
      if (floodAnimationRef.current) {
        cancelAnimationFrame(floodAnimationRef.current)
      }
      setFloodStatistics(null)
      setFloodTimeProgress(0)
    }

    return () => {
      if (floodAnimationRef.current) {
        cancelAnimationFrame(floodAnimationRef.current)
      }
    }
  }, [showBatchViewer, batchViewerConnection])

  // 管理粒子系統的生命週期
  useEffect(() => {
    // 提取封包陣列（後端返回的格式是 { packets: [...] }）
    const packets = connectionPackets?.packets || []

    // 清理舊的粒子系統
    if (particleSystemRef.current) {
      particleSystemRef.current.destroy()
      particleSystemRef.current = null
    }

    // 如果有封包資料，創建新的粒子系統
    if (packets.length > 0) {
      particleSystemRef.current = new PacketParticleSystem(
        packets,
        null, // connectionPath 稍後從 connections 中獲取
        {
          loop: true,
          speed: particleSpeed,
          showLabels: true,
          connectionId: connectionPackets?.connection_id || selectedConnectionId
        }
      )

      // 更新全局時間範圍以包含這個連線的封包
      const particleDuration = particleSystemRef.current.duration // 毫秒
      if (particleDuration > globalDuration) {
        setGlobalDuration(particleDuration)
        // 同時更新全局時間戳範圍（使用封包的時間範圍）
        globalStartTimestamp.current = particleSystemRef.current.startTimestamp
        globalEndTimestamp.current = particleSystemRef.current.endTimestamp
      }

      // 設置播放狀態
      if (isParticleAnimationPlaying) {
        particleSystemRef.current.play()
      } else {
        particleSystemRef.current.pause()
      }
    }

    // 清理函數
    return () => {
      if (particleSystemRef.current) {
        particleSystemRef.current.destroy()
        particleSystemRef.current = null
      }
    }
  }, [connectionPackets, particleSpeed, isParticleAnimationPlaying])

  // 時間軸控制函數
  // 全局時間軸控制（統一控制所有動畫）
  const handlePlayPause = useCallback(() => {
    setIsGlobalPlaying(prev => !prev)
  }, [])

  const handleSpeedChange = useCallback((newSpeed) => {
    setGlobalSpeed(newSpeed)
  }, [])

  const handleSeek = useCallback((progress) => {
    if (globalDuration > 0) {
      globalTimeRef.current = progress * globalDuration
      setGlobalTimeDisplay(globalTimeRef.current)
    }
  }, [globalDuration])

  const handleStepForward = useCallback(() => {
    // 跳到下一個封包或階段（暫時簡化為跳轉 1 秒）
    if (globalDuration > 0) {
      const newTime = globalTimeRef.current + 1000 // 前進 1 秒
      globalTimeRef.current = newTime >= globalDuration ? 0 : newTime
      setGlobalTimeDisplay(globalTimeRef.current)
    }
  }, [globalDuration])

  const handleStepBackward = useCallback(() => {
    // 跳到上一個封包或階段（暫時簡化為後退 1 秒）
    if (globalDuration > 0) {
      const newTime = globalTimeRef.current - 1000 // 後退 1 秒
      globalTimeRef.current = newTime < 0 ? globalDuration - 1000 : newTime
      setGlobalTimeDisplay(globalTimeRef.current)
    }
  }, [globalDuration])

  // 計算動態畫布尺寸
  useEffect(() => {
    if (timelines.length === 0) return

    const nodeCount = new Set(
      timelines.flatMap(t => {
        const parsed = parseTimelineId(t)
        return parsed ? [parsed.src.ip, parsed.dst.ip] : []
      })
    ).size

    const connectionCount = timelines.length
    const newCanvasSize = calculateCanvasSize(nodeCount, connectionCount)

    setCanvasSize(newCanvasSize)
  }, [timelines])

  // 初始化節點布局（使用力導向圖）
  const baseNodes = useMemo(() => buildNodeLayout(timelines, canvasSize), [timelines, canvasSize])

  // 力導向圖持續模擬
  useEffect(() => {
    if (!baseNodes.length) {
      setNodePositions({})
      setIsLayoutStable(false)
      return
    }

    // 初始化節點位置
    const initialPositions = {}
    baseNodes.forEach(node => {
      initialPositions[node.id] = { x: node.x, y: node.y, isCenter: node.isCenter }
    })
    setNodePositions(initialPositions)

    // 初始化速度
    velocitiesRef.current.clear()
    baseNodes.forEach(node => {
      velocitiesRef.current.set(node.id, { x: 0, y: 0 })
    })

    // 建立連線資訊
    const connections = []
    timelines.forEach((timeline) => {
      const parsed = parseTimelineId(timeline)
      if (parsed && parsed.src?.ip && parsed.dst?.ip) {
        connections.push({
          src: parsed.src.ip,
          dst: parsed.dst.ip
        })
      }
    })

    // 動態計算力導向圖參數
    const forceParams = calculateDynamicForceParams(baseNodes.length)
    const params = {
      ...FORCE_PARAMS,
      ...forceParams
    }

    let animationFrameId = null
    let iterationCount = 0
    let lastStableCheck = 0

    // 力導向圖模擬循環
    const simulate = () => {
      // 如果拖曳中或已暫停，跳過模擬
      if (draggingNodeId) {
        animationFrameId = requestAnimationFrame(simulate)
        return
      }

      // 從 state 獲取當前節點位置
      setNodePositions(currentPositions => {
        const currentNodes = baseNodes.map(node => ({
          ...node,
          x: currentPositions[node.id]?.x ?? node.x,
          y: currentPositions[node.id]?.y ?? node.y
        }))

        // 計算力並更新位置
        const forces = calculateForces(currentNodes, connections, params)
        const updatedNodes = applyForces(currentNodes, forces, velocitiesRef.current, params)

        // 轉換為位置字典
        const newPositions = {}
        updatedNodes.forEach(node => {
          newPositions[node.id] = { x: node.x, y: node.y, isCenter: node.isCenter }
        })

        // 每隔一段時間檢查穩定性
        iterationCount++
        if (iterationCount - lastStableCheck > 30) {
          lastStableCheck = iterationCount

          // 計算總動能判斷是否穩定
          let totalKineticEnergy = 0
          velocitiesRef.current.forEach(vel => {
            totalKineticEnergy += vel.x * vel.x + vel.y * vel.y
          })

          if (totalKineticEnergy < params.stabilityThreshold) {
            if (!isLayoutStable) {
              setIsLayoutStable(true)
              setNeedsFitToView(true) // 觸發 Fit-to-View
            }
            // 穩定後繼續運行一小段時間，然後停止
            if (iterationCount > params.initialIterations + 50) {
              return currentPositions // 保持當前位置，不再更新
            }
          } else {
            setIsLayoutStable(false)
          }
        }

        return newPositions
      })

      animationFrameId = requestAnimationFrame(simulate)
    }

    // 啟動模擬
    animationFrameId = requestAnimationFrame(simulate)

    // 清理函數
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
      }
    }
  }, [baseNodes, timelines, draggingNodeId])

  const nodesComputed = useMemo(() => baseNodes.map(n => {
    const pos = nodePositions[n.id]
    // 如果 nodePositions 中的座標無效，使用 baseNodes 的原始座標
    if (pos && isFinite(pos.x) && isFinite(pos.y)) {
      return { ...n, ...pos }
    }
    return n
  }), [baseNodes, nodePositions])
  const nodeMap = useMemo(() => {
    const map = new Map()
    nodesComputed.forEach((node) => map.set(node.id, node))
    return map
  }, [nodesComputed])

  // 建立兩種連線列表：詳細版（每條獨立連線）和合併版（遠景模式用）
  const detailedConnections = useMemo(() => buildConnections(timelines), [timelines])
  const aggregatedConnections = useMemo(() => buildAggregatedConnections(timelines), [timelines])

  // 根據模式選擇使用哪種連線列表
  // 1. 遠景模式：使用合併連線（減少視覺混亂）
  // 2. 聚合連線近景模式（showBatchViewer）：只顯示被選中的聚合連線
  // 3. 一般近景模式（isFocusMode）：使用詳細連線（顯示每條獨立的 TCP stream）
  const connections = useMemo(() => {
    if (showBatchViewer && batchViewerConnection) {
      // 聚合連線近景：只顯示被選中的聚合連線
      return [batchViewerConnection]
    }
    if (isFocusMode) {
      // 一般近景：詳細連線
      return detailedConnections
    }
    // 遠景模式：合併連線
    return aggregatedConnections
  }, [showBatchViewer, batchViewerConnection, isFocusMode, detailedConnections, aggregatedConnections])

  // 計算每個節點的連線角度分散索引
  const connectionAngles = useMemo(() => {
    const nodeConnections = new Map() // 節點 -> 該節點的所有連線

    connections.forEach(conn => {
      // 記錄從 src 出發的連線
      if (!nodeConnections.has(conn.src)) {
        nodeConnections.set(conn.src, [])
      }
      nodeConnections.get(conn.src).push({ ...conn, direction: 'out' })

      // 記錄到 dst 的連線
      if (!nodeConnections.has(conn.dst)) {
        nodeConnections.set(conn.dst, [])
      }
      nodeConnections.get(conn.dst).push({ ...conn, direction: 'in' })
    })

    // 為每條連線計算角度索引
    const angleMap = new Map()
    nodeConnections.forEach((conns, nodeId) => {
      const outConns = conns.filter(c => c.direction === 'out')
      outConns.forEach((conn, index) => {
        angleMap.set(conn.id, {
          index,
          total: outConns.length,
          direction: 'out'
        })
      })
    })

    return angleMap
  }, [connections])

  // 執行 Fit-to-View
  useEffect(() => {
    if (needsFitToView && nodesComputed.length > 0) {
      // 延遲執行，確保節點位置已更新
      const timer = setTimeout(() => {
        fitToView(nodesComputed)
        setNeedsFitToView(false)
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [needsFitToView, nodesComputed, fitToView])

  return (
    <div className="bg-slate-950 text-slate-100">
      <header className="px-8 pt-6">
        <div className="max-w-6xl mx-auto flex flex-col gap-6">
          <div>
            <h2 className="text-xl font-bold text-slate-100">
              協議時間軸分析
            </h2>
            <p className="text-sm text-slate-400 mt-2 max-w-2xl">
              上傳 Wireshark 擷取檔，觀察心智圖沿著時間軸動畫呈現 TCP 交握、UDP 傳輸與其他協定事件。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-200 hover:bg-cyan-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
              {uploading ? '正在上傳...' : '上傳 PCAP／PCAPNG'}
            </button>

            <button
              type="button"
              onClick={loadTimelines}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800/60"
            >
              <RefreshCcw className="w-4 h-4" />
              Reload
            </button>

            {/* 暫停/播放按鈕 */}
            <button
              type="button"
              onClick={() => setIsPaused(!isPaused)}
              className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium ${
                isPaused
                  ? 'border-green-500/40 bg-green-500/10 text-green-200 hover:bg-green-500/20'
                  : 'border-amber-500/40 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20'
              }`}
            >
              {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              {isPaused ? '播放' : '暫停'}
            </button>

            {/* 焦點模式按鈕 - 只在有選中連線時顯示 */}
            {selectedConnectionId && (
              <button
                type="button"
                onClick={() => {
                  setIsFocusMode(!isFocusMode)
                  if (!isFocusMode) {
                    setIsPaused(true) // 進入焦點模式時自動暫停
                  }
                }}
                className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium ${
                  isFocusMode
                    ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20'
                    : 'border-purple-500/40 bg-purple-500/10 text-purple-200 hover:bg-purple-500/20'
                }`}
              >
                {isFocusMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {isFocusMode ? '退出焦點' : '特定顯示'}
              </button>
            )}

            {generatedAt && (
              <div className="text-xs text-slate-500 flex items-center gap-1">
                <Clock className="w-4 h-4 text-slate-500" />
                Generated {new Date(generatedAt).toLocaleString()}
              </div>
            )}

            {sourceFiles.length > 0 && (
              <div className="text-xs text-slate-500 flex items-center gap-1">
                <CircleDot className="w-4 h-4 text-emerald-400" />
                {sourceFiles.join('、')}
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-3 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              <AlertTriangle className="w-4 h-4" />
              {error}
            </div>
          )}
        </div>
      </header>

      <main className="px-8 pb-12">
        <div className="max-w-6xl mx-auto mt-8 grid gap-6 lg:grid-cols-[2fr_1fr]">
          <section className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur">
            {loading ? (
              <div className="flex h-[480px] items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-slate-500" />
              </div>
            ) : connections.length === 0 ? (
              <div className="flex h-[480px] items-center justify-center text-sm text-slate-500">
                目前沒有協定時間軸資料。請上傳 PCAP/PCAPNG 擷取檔開始分析。
              </div>
            ) : showBatchViewer && batchViewerConnection ? (
              /* 近景模式：簡化的封包動畫視圖 */
              <div className="relative">
                {(() => {
                  // 解析連線資訊
                  const connId = batchViewerConnection.originalId || batchViewerConnection.id || ''
                  const parts = connId.replace('aggregated-', '').split('-')
                  const srcLabel = parts.length >= 3 ? `${parts[1]}:${parts[2]}` : batchViewerConnection.src || 'Source'
                  const dstLabel = parts.length >= 5 ? `${parts[3]}:${parts[4]}` : batchViewerConnection.dst || 'Destination'
                  const protocol = (parts[0] || 'TCP').toUpperCase()
                  const connectionCount = batchViewerConnection.connectionCount || 1
                  const isAttack = connectionCount > 50

                  // 動畫參數
                  const srcX = 15, srcY = 50
                  const dstX = 85, dstY = 50
                  const pathD = `M ${srcX} ${srcY} Q 50 35 ${dstX} ${dstY}` // 弧形路徑

                  // 計算點在路徑上的位置（二次貝茲曲線）
                  const getPointOnPath = (t) => {
                    const x = (1-t)*(1-t)*srcX + 2*(1-t)*t*50 + t*t*dstX
                    const y = (1-t)*(1-t)*srcY + 2*(1-t)*t*35 + t*t*dstY
                    return { x, y }
                  }

                  return (
                    <>
                    <svg
                      viewBox="0 0 100 100"
                      preserveAspectRatio="xMidYMid meet"
                      className="w-full h-[480px] rounded-2xl"
                      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}
                    >
                      <defs>
                        <filter id="animNodeGlow" filterUnits="userSpaceOnUse">
                          <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur" />
                          <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                          </feMerge>
                        </filter>
                        <linearGradient id="pathGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor={isAttack ? '#ef4444' : '#38bdf8'} />
                          <stop offset="50%" stopColor={isAttack ? '#f97316' : '#22d3ee'} />
                          <stop offset="100%" stopColor={isAttack ? '#ef4444' : '#38bdf8'} />
                        </linearGradient>
                        <pattern id="animGrid" width="10" height="10" patternUnits="userSpaceOnUse">
                          <circle cx="5" cy="5" r="0.3" fill="#334155" opacity="0.5" />
                        </pattern>
                      </defs>

                      {/* 背景網格 */}
                      <rect width="100" height="100" fill="url(#animGrid)" />

                      {/* 標題 */}
                      <text x="50" y="8" textAnchor="middle" className="text-[3px] fill-slate-400 font-medium">
                        封包傳輸動畫
                      </text>
                      <text x="50" y="13" textAnchor="middle" className="text-[2.2px] fill-cyan-400 font-mono">
                        {protocol} {isAttack && `⚠ ${connectionCount} 連線`}
                      </text>

                      {/* 連接路徑 - 外層光暈 */}
                      <path
                        d={pathD}
                        stroke="url(#pathGradient)"
                        strokeWidth="1.5"
                        strokeOpacity="0.2"
                        fill="none"
                        strokeLinecap="round"
                      />
                      {/* 連接路徑 - 主線 */}
                      <path
                        d={pathD}
                        stroke="url(#pathGradient)"
                        strokeWidth="0.6"
                        strokeOpacity="0.8"
                        fill="none"
                        strokeLinecap="round"
                        strokeDasharray={isAttack ? "2 1" : "none"}
                      />

                      {/* 來源節點 */}
                      <g transform={`translate(${srcX}, ${srcY})`}>
                        <circle r="5" fill="#1e293b" stroke="#38bdf8" strokeWidth="0.4" filter="url(#animNodeGlow)" />
                        <circle r="3.5" fill="#0f172a" stroke="#22d3ee" strokeWidth="0.3" />
                        <text y="0.8" textAnchor="middle" className="text-[2px] fill-cyan-300 font-bold">SRC</text>
                        <text y="10" textAnchor="middle" className="text-[1.8px] fill-slate-300 font-mono">{srcLabel}</text>
                      </g>

                      {/* 目的節點 */}
                      <g transform={`translate(${dstX}, ${dstY})`}>
                        <circle r="5" fill="#1e293b" stroke={isAttack ? '#ef4444' : '#10b981'} strokeWidth="0.4" filter="url(#animNodeGlow)" />
                        <circle r="3.5" fill="#0f172a" stroke={isAttack ? '#f87171' : '#34d399'} strokeWidth="0.3" />
                        <text y="0.8" textAnchor="middle" className={`text-[2px] font-bold ${isAttack ? 'fill-red-300' : 'fill-emerald-300'}`}>DST</text>
                        <text y="10" textAnchor="middle" className="text-[1.8px] fill-slate-300 font-mono">{dstLabel}</text>
                      </g>

                      {/* 封包粒子動畫 - 包含生命週期效果 */}
                      {particleSystemRef.current && (() => {
                        const particles = particleSystemRef.current.getActiveParticles()
                        return particles.map(particle => {
                          const point = getPointOnPath(particle.position)
                          const isSelected = selectedPacketIndex === particle.index
                          // 應用生命週期縮放
                          const displaySize = particle.size * (particle.scale || 1)
                          const displayOpacity = particle.opacity || 1
                          // 根據階段決定光暈強度
                          const glowOpacity = 0.3 + (particle.glowIntensity || 0) * 0.5
                          // 階段指示顏色
                          const phaseColor = particle.phase === 'spawn' ? '#22d3ee' :
                                           particle.phase === 'arrive' ? '#fbbf24' : particle.color

                          return (
                            <g
                              key={particle.id}
                              style={{
                                opacity: displayOpacity,
                                transition: 'opacity 0.1s ease-out'
                              }}
                            >
                              {/* 生成階段額外光環 */}
                              {particle.phase === 'spawn' && (
                                <circle
                                  cx={point.x}
                                  cy={point.y}
                                  r={displaySize * 1.5}
                                  fill="none"
                                  stroke="#22d3ee"
                                  strokeWidth="0.15"
                                  opacity={0.6 * (1 - (particle.phaseProgress || 0))}
                                />
                              )}

                              {/* 到達階段吸收環 */}
                              {particle.phase === 'arrive' && (
                                <>
                                  <circle
                                    cx={point.x}
                                    cy={point.y}
                                    r={displaySize * (2 - (particle.phaseProgress || 0))}
                                    fill="none"
                                    stroke="#fbbf24"
                                    strokeWidth="0.1"
                                    opacity={0.4 * (particle.phaseProgress || 0)}
                                    strokeDasharray="0.5 0.5"
                                  />
                                  {/* 螺旋吸入效果線 */}
                                  {[0, 120, 240].map((angle, i) => (
                                    <line
                                      key={i}
                                      x1={point.x + Math.cos((angle + (particle.phaseProgress || 0) * 180) * Math.PI / 180) * displaySize * 1.5}
                                      y1={point.y + Math.sin((angle + (particle.phaseProgress || 0) * 180) * Math.PI / 180) * displaySize * 1.5}
                                      x2={point.x}
                                      y2={point.y}
                                      stroke="#fbbf24"
                                      strokeWidth="0.08"
                                      opacity={0.3 * (particle.phaseProgress || 0)}
                                    />
                                  ))}
                                </>
                              )}

                              {/* 粒子光暈 */}
                              <circle
                                cx={point.x}
                                cy={point.y}
                                r={displaySize * 0.8}
                                fill={particle.glowColor || particle.color}
                                opacity={glowOpacity}
                                filter="url(#animNodeGlow)"
                              />

                              {/* 粒子主體 */}
                              <circle
                                cx={point.x}
                                cy={point.y}
                                r={displaySize * 0.4}
                                fill={particle.color}
                                opacity={isSelected ? 1 : 0.9}
                                stroke={isSelected ? '#ffd700' : 'none'}
                                strokeWidth={isSelected ? 0.3 : 0}
                                style={{ cursor: 'pointer' }}
                                onClick={() => setSelectedPacketIndex(particle.index)}
                              />

                              {/* TCP Flags 標籤 - 所有階段都顯示 */}
                              {particle.tcpFlags && (
                                <g style={{ opacity: displayOpacity }}>
                                  <rect
                                    x={point.x - 5}
                                    y={point.y - displaySize - 4}
                                    width="10"
                                    height="3"
                                    rx="0.5"
                                    fill="#1e293b"
                                    fillOpacity="0.95"
                                    stroke={particle.phase === 'spawn' ? '#22d3ee' :
                                           particle.phase === 'arrive' ? '#fbbf24' : particle.color}
                                    strokeWidth="0.15"
                                  />
                                  <text
                                    x={point.x}
                                    y={point.y - displaySize - 1.8}
                                    textAnchor="middle"
                                    className="text-[1.6px] fill-white font-mono font-bold"
                                    style={{ pointerEvents: 'none' }}
                                  >
                                    {particle.tcpFlags}
                                  </text>
                                </g>
                              )}

                              {/* 封包編號標籤 */}
                              <text
                                x={point.x}
                                y={point.y + displaySize + 2.5}
                                textAnchor="middle"
                                className="text-[1.4px] fill-slate-300 font-mono font-semibold"
                                style={{ pointerEvents: 'none', opacity: displayOpacity }}
                              >
                                #{particle.index}
                              </text>

                              {/* 階段指示文字 - 生成/到達時顯示 (在 TCP flags 上方) */}
                              {(particle.phase === 'spawn' || particle.phase === 'arrive') && (
                                <text
                                  x={point.x}
                                  y={point.y - displaySize - (particle.tcpFlags ? 5.5 : 1)}
                                  textAnchor="middle"
                                  className={`text-[1.3px] font-bold ${particle.phase === 'spawn' ? 'fill-cyan-300' : 'fill-amber-300'}`}
                                  style={{ pointerEvents: 'none' }}
                                >
                                  {particle.phase === 'spawn' ? '生成' : '到達'}
                                </text>
                              )}
                            </g>
                          )
                        })
                      })()}

                      {/* 洪流粒子效果 - 僅在沒有封包動畫時顯示（避免兩個動畫系統同時運行） */}
                      {isAttack && floodStatistics && !connectionPackets?.packets?.length && (
                        <FloodParticleSystem
                          fromPoint={{ x: srcX, y: srcY }}
                          toPoint={{ x: dstX, y: dstY }}
                          statistics={floodStatistics}
                          isPlaying={!isPaused}
                          timeProgress={floodTimeProgress}
                          onIntensityChange={handleFloodIntensityChange}
                        />
                      )}

                      {/* 統計資訊面板 */}
                      <g transform="translate(5, 75)">
                        <rect x="0" y="0" width="25" height="18" rx="1" fill="#1e293b" fillOpacity="0.9" stroke="#334155" strokeWidth="0.2" />
                        <text x="12.5" y="4" textAnchor="middle" className="text-[1.8px] fill-slate-400">統計資訊</text>
                        <text x="2" y="8" className="text-[1.5px] fill-slate-500">連線數:</text>
                        <text x="23" y="8" textAnchor="end" className="text-[1.5px] fill-cyan-400 font-mono">{connectionCount}</text>
                        <text x="2" y="11.5" className="text-[1.5px] fill-slate-500">封包數:</text>
                        <text x="23" y="11.5" textAnchor="end" className="text-[1.5px] fill-cyan-400 font-mono">{connectionPackets?.total_packets || connectionPackets?.packets?.length || '—'}</text>
                        <text x="2" y="15" className="text-[1.5px] fill-slate-500">類型:</text>
                        <text x="23" y="15" textAnchor="end" className={`text-[1.5px] font-mono ${isAttack ? 'fill-red-400' : 'fill-emerald-400'}`}>{isAttack ? '攻擊流量' : '正常流量'}</text>
                      </g>

                      {/* 圖例 - 含生命週期階段 */}
                      <g transform="translate(65, 70)">
                        <rect x="0" y="0" width="32" height="28" rx="1" fill="#1e293b" fillOpacity="0.9" stroke="#334155" strokeWidth="0.2" />
                        <text x="16" y="4" textAnchor="middle" className="text-[1.8px] fill-slate-400">圖例</text>

                        {/* 封包類型 */}
                        <circle cx="4" cy="8" r="1" fill="#38bdf8" />
                        <text x="7" y="8.5" className="text-[1.2px] fill-slate-400">正常封包</text>
                        <circle cx="4" cy="11.5" r="1" fill="#ef4444" />
                        <text x="7" y="12" className="text-[1.2px] fill-slate-400">異常/攻擊</text>
                        <circle cx="4" cy="15" r="1" fill="#22c55e" />
                        <text x="7" y="15.5" className="text-[1.2px] fill-slate-400">SYN 連線</text>

                        {/* 生命週期階段 */}
                        <text x="2" y="19" className="text-[1.2px] fill-slate-500">生命週期:</text>
                        <circle cx="4" cy="22" r="0.8" fill="#22d3ee" />
                        <circle cx="4" cy="22" r="1.3" fill="none" stroke="#22d3ee" strokeWidth="0.1" />
                        <text x="7" y="22.5" className="text-[1.1px] fill-cyan-300">生成</text>
                        <circle cx="16" cy="22" r="0.8" fill="#fbbf24" />
                        <circle cx="16" cy="22" r="1.3" fill="none" stroke="#fbbf24" strokeWidth="0.1" strokeDasharray="0.3 0.3" />
                        <text x="19" y="22.5" className="text-[1.1px] fill-amber-300">到達</text>

                        {/* 已選取 */}
                        <circle cx="4" cy="26" r="1" fill="#ffd700" stroke="#ffd700" strokeWidth="0.3" />
                        <text x="7" y="26.5" className="text-[1.2px] fill-slate-400">已選取</text>
                      </g>
                    </svg>

                    {/* 返回遠景模式的提示 */}
                    <div className="absolute top-4 right-4 bg-slate-800/90 backdrop-blur-sm border border-slate-600/50 rounded-lg px-3 py-2 shadow-lg">
                      <div className="text-xs text-slate-400">
                        點擊右側面板「關閉」按鈕返回遠景
                      </div>
                    </div>
                    </>
                  )
                })()}
              </div>
            ) : (
              <div className="relative">
                {/* 遠景模式：地圖式控制 UI：縮放顯示與控制按鈕 */}
                <div className="absolute bottom-4 left-4 z-10 flex flex-col gap-2">
                  {/* 縮放顯示 */}
                  <div className="bg-slate-800/90 backdrop-blur-sm border border-slate-600/50 rounded-lg px-3 py-2 shadow-lg">
                    <div className="flex items-center gap-2 text-xs text-slate-300">
                      <span className="font-mono font-semibold text-cyan-300">
                        {Math.round(viewTransform.scale * 100)}%
                      </span>
                    </div>
                  </div>

                  {/* 縮放控制按鈕 */}
                  <div className="bg-slate-800/90 backdrop-blur-sm border border-slate-600/50 rounded-lg shadow-lg overflow-hidden">
                    <button
                      onClick={() => {
                        setViewTransform(prev => ({
                          ...prev,
                          scale: clamp(prev.scale * 1.2, 0.2, 5)
                        }))
                      }}
                      className="w-full px-3 py-2 text-slate-300 hover:bg-slate-700/50 transition-colors border-b border-slate-600/30"
                      title="放大 (Zoom In)"
                    >
                      <span className="text-lg font-bold">+</span>
                    </button>
                    <button
                      onClick={() => {
                        setViewTransform(prev => ({
                          ...prev,
                          scale: clamp(prev.scale / 1.2, 0.2, 5)
                        }))
                      }}
                      className="w-full px-3 py-2 text-slate-300 hover:bg-slate-700/50 transition-colors"
                      title="縮小 (Zoom Out)"
                    >
                      <span className="text-lg font-bold">−</span>
                    </button>
                  </div>

                  {/* Reset View 按鈕 */}
                  <button
                    onClick={resetView}
                    className="bg-slate-800/90 backdrop-blur-sm border border-slate-600/50 rounded-lg px-3 py-2 shadow-lg hover:bg-slate-700/70 transition-colors"
                    title="重置視圖 (Reset View)"
                  >
                    <RefreshCcw className="w-4 h-4 text-slate-300" />
                  </button>
                </div>

                <svg
                  ref={svgRef}
                  viewBox={`0 0 ${canvasSize} ${canvasSize}`}
                  className="w-full h-[480px] text-slate-400"
                  onWheel={handleWheelZoom}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  style={{ touchAction: 'none' }}
                >
                  <defs>
                    <filter id="nodeGlow" filterUnits="userSpaceOnUse">
                      <feGaussianBlur in="SourceGraphic" stdDeviation="1" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                    {/* 攻擊警告光暈濾鏡 */}
                    <filter id="attackWarningGlow" filterUnits="userSpaceOnUse" x="-100%" y="-100%" width="300%" height="300%">
                      <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur1" />
                      <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur2" />
                      <feColorMatrix in="blur1" type="matrix" values="1 0 0 0 0.8  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="redBlur1" />
                      <feColorMatrix in="blur2" type="matrix" values="1 0 0 0 0.9  0 0 0 0 0.2  0 0 0 0 0  0 0 0 0.5 0" result="redBlur2" />
                      <feMerge>
                        <feMergeNode in="redBlur2" />
                        <feMergeNode in="redBlur1" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                    {/* 中等強度警告光暈 */}
                    <filter id="attackWarningGlowMedium" filterUnits="userSpaceOnUse" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
                      <feColorMatrix in="blur" type="matrix" values="1 0 0 0 0.6  0 0 0 0 0.3  0 0 0 0 0  0 0 0 0.8 0" result="orangeBlur" />
                      <feMerge>
                        <feMergeNode in="orangeBlur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>

                  <g transform={`translate(${viewTransform.tx} ${viewTransform.ty}) scale(${viewTransform.scale})`}>

                  {connections.map((connection) => {
                    const fromNode = nodeMap.get(connection.src)
                    const toNode = nodeMap.get(connection.dst)
                    if (!fromNode || !toNode) {
                      return null
                    }

                    // 跳過座標無效的連線（防止 NaN 渲染錯誤）
                    if (!isFinite(fromNode.x) || !isFinite(fromNode.y) || !isFinite(toNode.x) || !isFinite(toNode.y)) {
                      return null
                    }

                    // 焦點模式: 只顯示選中的連線
                    if (isFocusMode && selectedConnectionId && connection.id !== selectedConnectionId) {
                      return null
                    }

                    // 從 controller 獲取豐富的動畫狀態
                    const renderState = renderStates[connection.originalId] // 使用 originalId 匹配 timeline.id
                    // 聚合連線使用 primaryProtocolType/primaryProtocol，一般連線使用 protocolType/protocol
                    const protocolType = renderState?.protocolType || connection.protocolType || connection.primaryProtocolType
                    const protocol = connection.protocol || connection.primaryProtocol || 'TCP'
                    const color = renderState?.protocolColor || protocolColor(protocol, protocolType)
                    const visualEffects = renderState?.visualEffects || {}

                    // 圓點動畫沿路徑
                    const dotProgress = renderState?.dotPosition ?? renderState?.stageProgress ?? 0
                    const stageLabel = translateStageLabel(renderState?.currentStage?.label) || '??'
                    const fromPoint = { x: fromNode.x, y: fromNode.y }
                    const toPoint = { x: toNode.x, y: toNode.y }

                    // 檢測是否連接到中心節點
                    const fromIsCenter = fromNode.isCenter
                    const toIsCenter = toNode.isCenter
                    const hasCenter = fromIsCenter || toIsCenter

                    // 計算連線的基礎向量和角度
                    const dx = toPoint.x - fromPoint.x
                    const dy = toPoint.y - fromPoint.y
                    const baseAngle = Math.atan2(dy, dx)
                    const distance = Math.hypot(dx, dy)

                    // 角度分散：為從同一節點出發的連線添加偏移
                    let angleOffset = 0
                    const angleInfo = connectionAngles.get(connection.id)

                    if (angleInfo && angleInfo.total > 1 && hasCenter) {
                      // 只對連接到中心節點的連線應用角度分散
                      const spreadRange = Math.PI / 18 // ±10度範圍
                      const centerOffset = (angleInfo.index - (angleInfo.total - 1) / 2)
                      angleOffset = centerOffset * spreadRange / Math.max(angleInfo.total / 2, 1)
                    } else if (connection.bundleSize > 1) {
                      // 對同一路徑的束狀連線應用較小的偏移
                      const maxAngleOffset = Math.PI / 72 // ±2.5度
                      angleOffset = connection.bundleOffset * maxAngleOffset / Math.max(connection.bundleSize / 2, 1)
                    }

                    // 計算調整後的起點和終點（從節點圓周出發）
                    const fromRadius = fromIsCenter ? CENTRAL_NODE_OUTER_RADIUS : NODE_OUTER_RADIUS
                    const toRadius = toIsCenter ? CENTRAL_NODE_OUTER_RADIUS : NODE_OUTER_RADIUS

                    const adjustedAngle = baseAngle + angleOffset
                    const adjustedFromPoint = {
                      x: fromPoint.x + Math.cos(adjustedAngle) * fromRadius * 1.2,
                      y: fromPoint.y + Math.sin(adjustedAngle) * fromRadius * 1.2
                    }
                    const adjustedToPoint = {
                      x: toPoint.x - Math.cos(adjustedAngle) * toRadius * 1.2,
                      y: toPoint.y - Math.sin(adjustedAngle) * toRadius * 1.2
                    }

                    // 放射狀布局：使用調整後的點
                    const dotX = adjustedFromPoint.x + (adjustedToPoint.x - adjustedFromPoint.x) * dotProgress
                    const dotY = adjustedFromPoint.y + (adjustedToPoint.y - adjustedFromPoint.y) * dotProgress
                    const dotPoint = { x: dotX, y: dotY }

                    // 智能標籤定位：遠離中心節點
                    let labelProgress
                    if (hasCenter) {
                      // 如果連接到中心節點，將標籤放在遠離中心的位置
                      if (fromIsCenter) {
                        // 從中心出發：標籤在 40%-60% 之間（靠近目標端）
                        labelProgress = clamp(0.4 + dotProgress * 0.2, 0.4, 0.6)
                      } else {
                        // 到中心：標籤在 40%-60% 之間（靠近起點端）
                        labelProgress = clamp(0.4 + dotProgress * 0.2, 0.4, 0.6)
                      }
                    } else {
                      // 非中心連線：跟隨動畫點並稍微偏移
                      labelProgress = clamp(dotProgress + 0.1, 0, 1)
                    }

                    const labelPoint = {
                      x: adjustedFromPoint.x + (adjustedToPoint.x - adjustedFromPoint.x) * labelProgress,
                      y: adjustedFromPoint.y + (adjustedToPoint.y - adjustedFromPoint.y) * labelProgress
                    }

                    const midpoint = {
                      x: (adjustedFromPoint.x + adjustedToPoint.x) / 2,
                      y: (adjustedFromPoint.y + adjustedToPoint.y) / 2
                    }
                    const completionPoint = midpoint
                    const pathD = `M ${adjustedFromPoint.x} ${adjustedFromPoint.y} L ${adjustedToPoint.x} ${adjustedToPoint.y}`

                    const connectionStyle = renderState?.connectionStyle || 'solid'
                    const strokeDasharray = connectionStyle === 'dashed'
                      ? '2 2'
                      : connectionStyle === 'dotted'
                        ? '1 1'
                        : null
                    const opacity = visualEffects.opacity ?? 1.0
                    const isBlinking = visualEffects.blinking
                    const isPulsing = visualEffects.pulsing
                    const isCompleted = renderState?.isCompleted

                    const isHovered = hoveredConnectionId === connection.id
                    const isSelected = selectedConnectionId === connection.id
                    const isAggregated = connection.id?.startsWith('aggregated-')
                    const shouldShowLabel = isHovered || isSelected

                    // 聚焦模式：當選中連線時，只顯示該連線，隱藏其他連線
                    const shouldHide = selectedConnectionId && !isSelected
                    if (shouldHide) return null

                    const isDimmed = !isFocusMode && hoveredConnectionId && !isHovered && !isSelected
                    const finalOpacity = isDimmed ? opacity * 0.15 : opacity

                    return (
                      <g
                        key={connection.id}
                        onMouseEnter={(e) => {
                          setHoveredConnectionId(connection.id)
                          const rect = svgRef.current?.getBoundingClientRect()
                          if (rect) {
                            setTooltipPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top })
                          }
                        }}
                        onMouseLeave={() => setHoveredConnectionId(null)}
                        onClick={() => {
                          // 檢查是否為聚合連線
                          if (connection.id?.startsWith('aggregated-')) {
                            // 聚合連線：開啟批量檢視器
                            if (showBatchViewer && batchViewerConnection?.id === connection.id) {
                              // 點擊同一聚合連線，關閉檢視器
                              setShowBatchViewer(false)
                              setBatchViewerConnection(null)
                              setSelectedConnectionId(null)
                              setConnectionPackets(null)  // 清除封包資料
                            } else {
                              // 開啟檢視器
                              setShowBatchViewer(true)
                              setBatchViewerConnection(connection)
                              // 新增：設置選中的連線 ID 並獲取封包資料以啟用近景粒子系統
                              setSelectedConnectionId(connection.id)
                              // 判斷是否為攻擊流量（連線數 > 50）
                              const isAttackTraffic = (connection.connectionCount || 0) > 50
                              if (isAttackTraffic) {
                                // 攻擊流量：使用批量封包資料
                                fetchBatchPacketsForAnimation(connection)
                              } else {
                                // 少量連線：使用第一個子連線的封包
                                const firstChildId = connection.connections?.[0]?.originalId || connection.originalId
                                fetchConnectionPackets(firstChildId)
                              }
                            }
                          } else {
                            // 普通連線：統一使用 BatchPacketViewer
                            if (selectedConnectionId === connection.id) {
                              // 點擊同一連線，關閉檢視器
                              setShowBatchViewer(false)
                              setBatchViewerConnection(null)
                              setSelectedConnectionId(null)
                              setConnectionPackets(null)
                            } else {
                              // 構造單一連線的 batchViewerConnection 格式
                              const singleConnection = {
                                ...connection,
                                connectionCount: 1,
                                connections: [{
                                  originalId: connection.originalId || connection.id,
                                  ...connection
                                }]
                              }
                              setShowBatchViewer(true)
                              setBatchViewerConnection(singleConnection)
                              setSelectedConnectionId(connection.id)
                              // 同時獲取封包資料供動畫使用
                              fetchConnectionPackets(connection.originalId || connection.id)
                            }
                          }
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        {/* 判斷是否為當前檢視中的聚合連線 */}
                        {(() => {
                          const isActiveFloodConnection = isAggregated && showBatchViewer && connection.id === batchViewerConnection?.id
                          // 脈動效果：基於強度的線條粗細變化
                          const pulseMultiplier = isActiveFloodConnection
                            ? 1 + floodIntensity * 0.5 * Math.sin(Date.now() / 200) // 脈動頻率約 5Hz
                            : 1
                          // 警告濾鏡：強度超過 50% 時套用
                          const warningFilter = isActiveFloodConnection && floodIntensity > 0.5
                            ? floodIntensity > 0.7 ? 'url(#attackWarningGlow)' : 'url(#attackWarningGlowMedium)'
                            : undefined
                          // 高強度時使用紅色
                          const strokeColor = isActiveFloodConnection && floodIntensity > 0.7
                            ? '#ef4444' // 紅色警告
                            : isActiveFloodConnection && floodIntensity > 0.5
                              ? '#f97316' // 橙色警告
                              : color

                          return (
                            <path
                              d={pathD}
                              stroke={strokeColor}
                              strokeWidth={
                                isAggregated
                                  ? (connection.strokeWidth || 1) * (isSelected ? 1.5 : isHovered ? 1.3 : 1) * pulseMultiplier
                                  : (isSelected ? 1.8 : isHovered ? 1.5 : isCompleted ? 1.2 : 0.8)
                              }
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeOpacity={finalOpacity * (isActiveFloodConnection ? 0.6 : 0.35)}
                              strokeDasharray={strokeDasharray || undefined}
                              fill="none"
                              filter={warningFilter}
                            />
                          )
                        })()}

                        {/* 洪流粒子效果 - 僅在沒有封包動畫時顯示（避免與 PacketParticleSystem 衝突） */}
                        {isAggregated && showBatchViewer && floodStatistics && connection.id === batchViewerConnection?.id && isAttackTraffic && !connectionPackets?.packets?.length && (
                          <FloodParticleSystem
                            fromPoint={adjustedFromPoint}
                            toPoint={adjustedToPoint}
                            statistics={floodStatistics}
                            isPlaying={!isPaused}
                            timeProgress={floodTimeProgress}
                            onIntensityChange={handleFloodIntensityChange}
                          />
                        )}

                        {/* 遠景動畫元素 - 只在沒有粒子系統時顯示 */}
                        {!(isSelected && particleSystemRef.current) && (
                          <>
                            {/* 動畫圓點 - 聚合連線根據連線數量調整大小 */}
                            <circle
                              cx={dotPoint.x}
                              cy={dotPoint.y}
                              r={
                                isAggregated
                                  ? Math.min(1.6 + Math.log10(connection.connectionCount || 1) * 1.5, 4) * (isSelected ? 1.5 : 1)
                                  : (isSelected ? 2.8 : isPulsing ? 2.2 : 1.6)
                              }
                              fill={color}
                              filter="url(#nodeGlow)"
                              opacity={isBlinking ? 0.5 : finalOpacity}
                            >
                              {isPulsing && !isAggregated && (
                                <animate
                                  attributeName="r"
                                  values="1.6;2.4;1.6"
                                  dur="1s"
                                  repeatCount="indefinite"
                                />
                              )}
                              {isBlinking && (
                                <animate
                                  attributeName="opacity"
                                  values="0.3;1;0.3"
                                  dur="0.8s"
                                  repeatCount="indefinite"
                                />
                              )}
                            </circle>

                            {/* 跟隨小球移動的文字標籤 */}
                            <text
                              x={labelPoint.x}
                              y={labelPoint.y - 3.5}
                              textAnchor="middle"
                              className="text-[1.8px] fill-slate-100 font-semibold"
                              style={{ pointerEvents: 'none' }}
                              opacity={finalOpacity}
                            >
                              {(protocolType || protocol).toUpperCase()}
                            </text>
                            <text
                              x={labelPoint.x}
                              y={labelPoint.y - 1.8}
                              textAnchor="middle"
                              className="text-[1.4px] fill-cyan-300"
                              style={{ pointerEvents: 'none' }}
                              opacity={finalOpacity * 0.9}
                            >
                              {stageLabel}
                            </text>
                            {/* 聚合連線顯示連線數量 */}
                            {isAggregated && connection.connectionCount > 1 && (
                              <text
                                x={labelPoint.x}
                                y={labelPoint.y - 5.5}
                                textAnchor="middle"
                                className="text-[1.2px] fill-amber-400 font-bold"
                                style={{ pointerEvents: 'none' }}
                                opacity={finalOpacity * 0.85}
                              >
                                ×{connection.connectionCount}
                              </text>
                            )}

                            {/* 協議和階段標籤 */}
                            {shouldShowLabel && (
                              <>
                                <text
                                  x={midpoint.x}
                                  y={midpoint.y - 2}
                                  textAnchor="middle"
                                  className="text-[1.9px] fill-slate-200 font-semibold"
                                  style={{ pointerEvents: 'none' }}
                                >
                                  {(protocolType || protocol).toUpperCase()} · {stageLabel}
                                </text>

                                {/* 完成百分比 */}
                                <text
                                  x={completionPoint.x}
                                  y={completionPoint.y + 2}
                                  textAnchor="middle"
                                  className={`text-[1.6px] ${isCompleted ? 'fill-green-400' : 'fill-slate-500'}`}
                                  style={{ pointerEvents: 'none' }}
                                >
                                  {Math.round((renderState?.timelineProgress || 0) * 100)}% {isCompleted ? '✓' : '完成'}
                                </text>
                              </>
                            )}
                          </>
                        )}

                        {/* 封包粒子動畫 */}
                        {isSelected && particleSystemRef.current && (() => {
                          const particles = particleSystemRef.current.getActiveParticles()
                          return particles.map(particle => {
                            // 計算粒子在連線上的位置
                            const particleX = adjustedFromPoint.x + (adjustedToPoint.x - adjustedFromPoint.x) * particle.position
                            const particleY = adjustedFromPoint.y + (adjustedToPoint.y - adjustedFromPoint.y) * particle.position

                            return (
                              <g
                                key={particle.id}
                                style={{ cursor: 'pointer' }}
                              >
                                {/* 透明點擊區域 (hitbox) - 比可見粒子大很多，方便點擊 */}
                                <circle
                                  cx={particleX}
                                  cy={particleY}
                                  r={Math.max(particle.size * 2, 5)}
                                  fill="transparent"
                                  stroke="none"
                                  style={{ pointerEvents: 'all' }}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    e.preventDefault()
                                    setSelectedPacketIndex(particle.index)
                                  }}
                                />
                                {/* 粒子圓點 */}
                                <circle
                                  cx={particleX}
                                  cy={particleY}
                                  r={particle.size * 0.4}
                                  fill={particle.color}
                                  opacity={selectedPacketIndex === particle.index ? 1 : 0.9}
                                  filter={particle.glowColor || selectedPacketIndex === particle.index ? "url(#nodeGlow)" : undefined}
                                  stroke={selectedPacketIndex === particle.index ? "#FFD700" : "none"}
                                  strokeWidth={selectedPacketIndex === particle.index ? 0.3 : 0}
                                  style={{ pointerEvents: 'none' }}
                                >
                                  {/* 錯誤封包閃爍動畫 */}
                                  {particle.isError && (
                                    <animate
                                      attributeName="opacity"
                                      values="0.3;1;0.3"
                                      dur="0.6s"
                                      repeatCount="indefinite"
                                    />
                                  )}
                                </circle>

                                {/* 粒子外圈光暈（錯誤封包） */}
                                {particle.isError && (
                                  <circle
                                    cx={particleX}
                                    cy={particleY}
                                    r={particle.size * 0.7}
                                    fill="none"
                                    stroke={particle.color}
                                    strokeWidth="0.3"
                                    opacity="0.5"
                                  >
                                    <animate
                                      attributeName="r"
                                      values={`${particle.size * 0.5};${particle.size * 1.2};${particle.size * 0.5}`}
                                      dur="1s"
                                      repeatCount="indefinite"
                                    />
                                    <animate
                                      attributeName="opacity"
                                      values="0.7;0.2;0.7"
                                      dur="1s"
                                      repeatCount="indefinite"
                                    />
                                  </circle>
                                )}

                                {/* 封包標籤 */}
                                {particle.label && (
                                  <text
                                    x={particleX}
                                    y={particleY - particle.size * 0.8}
                                    textAnchor="middle"
                                    className="text-[1.2px] fill-white font-mono"
                                    style={{ pointerEvents: 'none' }}
                                    opacity={0.9}
                                  >
                                    {particle.label}
                                  </text>
                                )}

                                {/* 錯誤警告標記 */}
                                {particle.isError && (
                                  <text
                                    x={particleX + particle.size * 0.8}
                                    y={particleY - particle.size * 0.5}
                                    textAnchor="middle"
                                    className="text-[1.5px]"
                                    style={{ pointerEvents: 'none' }}
                                  >
                                    ⚠
                                  </text>
                                )}
                              </g>
                            )
                          })
                        })()}
                      </g>
                    )
                  })}

                  {nodesComputed.map((node) => {
                    // 跳過座標無效的節點（防止 NaN 渲染錯誤）
                    if (!isFinite(node.x) || !isFinite(node.y)) {
                      return null
                    }

                    // 根據是否為中心節點使用不同的視覺樣式
                    const outerRadius = node.isCenter ? CENTRAL_NODE_OUTER_RADIUS : NODE_OUTER_RADIUS
                    const innerRadius = node.isCenter ? CENTRAL_NODE_INNER_RADIUS : NODE_INNER_RADIUS
                    const labelOffsetY = node.isCenter ? CENTRAL_LABEL_OFFSET : -NODE_LABEL_OFFSET_TOP
                    const labelClass = node.isCenter
                      ? "text-[2.2px] font-bold fill-cyan-200"
                      : "text-[1.9px] font-semibold fill-slate-100"
                    const outerFill = node.isCenter ? "#020617" : "#0f172a"
                    const strokeWidth = node.isCenter ? 0.55 : 0.45

                    return (
                      <g key={node.id} onMouseDown={(e) => { e.stopPropagation(); setDraggingNodeId(node.id) }} style={{ cursor: node.isCenter ? 'default' : 'grab' }}>
                        <circle cx={node.x} cy={node.y} r={outerRadius} fill={outerFill} stroke="#1f2937" strokeWidth={strokeWidth} />
                        <circle cx={node.x} cy={node.y} r={innerRadius} fill="#1f2937" stroke="#38bdf8" strokeWidth={strokeWidth} filter="url(#nodeGlow)" />
                        <text
                          x={node.x}
                          y={node.y + labelOffsetY}
                          textAnchor="middle"
                          className={labelClass}
                          style={{ pointerEvents: 'none' }}
                        >
                          {node.label}
                        </text>
                        {node.isCenter && (
                          <text
                            x={node.x}
                            y={node.y + labelOffsetY + 2.5}
                            textAnchor="middle"
                            className="text-[1.5px] fill-amber-400 font-semibold"
                            style={{ pointerEvents: 'none' }}
                          >
                            網路中心
                          </text>
                        )}
                        {!node.isCenter && node.protocols.length > 0 && (
                          <text
                            x={node.x}
                            y={node.y + NODE_PROTOCOL_OFFSET}
                            textAnchor="middle"
                            className="text-[1.5px] fill-cyan-300 uppercase tracking-wide"
                          >
                            {node.protocols.join(' · ')}
                          </text>
                        )}
                      </g>
                    )
                  })}

                  </g>
                </svg>

                {/* 漸進式資訊揭露: Level 2 懸浮提示框 */}
                {hoveredConnectionId && !selectedConnectionId && (() => {
                  const hoveredConn = connections.find(c => c.id === hoveredConnectionId)
                  if (!hoveredConn) return null
                  const renderState = renderStates[hoveredConn.originalId] // 使用 originalId 匹配 timeline.id
                  const protocolType = renderState?.protocolType || hoveredConn.protocolType || hoveredConn.primaryProtocolType
                  const protocol = hoveredConn.protocol || hoveredConn.primaryProtocol || 'TCP'
                  const stageLabel = translateStageLabel(renderState?.currentStage?.label) || '??'
                  const progress = Math.round((renderState?.timelineProgress || 0) * 100)

                  return (
                    <div
                      className="absolute pointer-events-none z-50 bg-slate-800/95 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-600 shadow-xl backdrop-blur-sm"
                      style={{
                        left: `${tooltipPosition.x + 12}px`,
                        top: `${tooltipPosition.y - 12}px`,
                        transform: 'translate(-50%, -100%)'
                      }}
                    >
                      <div className="font-semibold text-cyan-300">{(protocolType || protocol).toUpperCase()}</div>
                      <div className="text-slate-300 text-[11px] mt-1">階段: {stageLabel}</div>
                      <div className="text-slate-400 text-[10px] mt-0.5">進度: {progress}%</div>
                    </div>
                  )
                })()}
              </div>
            )}
          </section>

          <aside className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
              <Activity className="w-4 h-4 text-cyan-300" />
              時間軸串流列表
            </div>

            <div className="mt-4 space-y-3 max-h-[450px] overflow-y-auto pr-2">
              {/* 連線列表 - 威脅分析已移至 BatchPacketViewer 統一顯示 */}
              {connections.map((connection) => {
                const renderState = renderStates[connection.originalId] // 使用 originalId 匹配 timeline.id
                const protocolType = renderState?.protocolType || connection.protocolType || connection.primaryProtocolType
                const protocol = connection.protocol || connection.primaryProtocol || 'TCP'
                const stageLabel = translateStageLabel(renderState?.currentStage?.label) || '??'
                const stageProgress = Math.round((renderState?.timelineProgress || 0) * 100)
                const isCompleted = renderState?.isCompleted
                const visualEffects = renderState?.visualEffects || {}

                // 協議圖示
                const getProtocolIcon = (protocol, type) => {
                  if (type === 'tcp-handshake') return <Wifi className="w-3 h-3" />
                  if (type === 'tcp-teardown') return <WifiOff className="w-3 h-3" />
                  if (type === 'ssh-secure' || protocol === 'https') return <Shield className="w-3 h-3" />
                  if (type === 'timeout') return <AlertCircle className="w-3 h-3" />
                  return <Activity className="w-3 h-3" />
                }

                // 漸進式資訊揭露: 當連線被選中時，在側邊欄高亮顯示
                const isSelected = selectedConnectionId === connection.id

                return (
                  <div
                    key={connection.id}
                    onClick={() => {
                      // 統一使用 BatchPacketViewer
                      if (selectedConnectionId === connection.id) {
                        // 點擊同一連線，關閉檢視器
                        setShowBatchViewer(false)
                        setBatchViewerConnection(null)
                        setSelectedConnectionId(null)
                        setConnectionPackets(null)
                      } else {
                        // 檢查是否為聚合連線
                        if (connection.id?.startsWith('aggregated-')) {
                          // 聚合連線：直接使用
                          setShowBatchViewer(true)
                          setBatchViewerConnection(connection)
                          setSelectedConnectionId(connection.id)
                          // 判斷是否為攻擊流量
                          const isAttackTraffic = (connection.connectionCount || 0) > 50
                          if (isAttackTraffic) {
                            fetchBatchPacketsForAnimation(connection)
                          } else {
                            const firstChildId = connection.connections?.[0]?.originalId || connection.originalId
                            fetchConnectionPackets(firstChildId)
                          }
                        } else {
                          // 普通連線：構造單一連線格式
                          const singleConnection = {
                            ...connection,
                            connectionCount: 1,
                            connections: [{
                              originalId: connection.originalId || connection.id,
                              ...connection
                            }]
                          }
                          setShowBatchViewer(true)
                          setBatchViewerConnection(singleConnection)
                          setSelectedConnectionId(connection.id)
                          fetchConnectionPackets(connection.originalId || connection.id)
                        }
                      }
                    }}
                    className={`rounded-lg border p-4 transition-all duration-300 cursor-pointer ${
                      isSelected
                        ? 'border-cyan-400 bg-cyan-900/40 shadow-lg shadow-cyan-500/20 ring-2 ring-cyan-400/50'
                        : isCompleted
                          ? 'border-green-500/60 bg-green-900/20 hover:bg-green-900/30'
                          : 'border-slate-700/60 bg-slate-900/40 hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className="font-mono text-slate-300">{connection.id}</span>
                      <div className="flex items-center gap-1">
                        {getProtocolIcon(connection.protocol, protocolType)}
                        <span className={`font-semibold ${
                          isCompleted ? 'text-green-300' : 'text-cyan-300'
                        }`}>
                          {(protocolType || protocol).toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>階段</span>
                        <div className="flex items-center gap-1">
                          {visualEffects.blinking && <span className="text-yellow-400">⚡</span>}
                          {visualEffects.pulsing && <span className="text-blue-400">💫</span>}
                          <span className={`${isCompleted ? 'text-green-200' : 'text-slate-200'}`}>
                            {stageLabel} {isCompleted && '✓'}
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                        <div
                          className={`h-full transition-all duration-300 ${
                            isCompleted
                              ? 'bg-gradient-to-r from-green-400 to-emerald-500'
                              : 'bg-gradient-to-r from-cyan-400 to-blue-500'
                          }`}
                          style={{ width: `${stageProgress}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>往返延遲 (RTT)</span>
                        <span>{connection.metrics?.rttMs ? `${connection.metrics.rttMs} ms` : '—'}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>封包數</span>
                        <span>{connection.metrics?.packetCount ?? '—'}</span>
                      </div>
                      {protocolType && protocolType !== connection.protocol && (
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>協議類型</span>
                          <span className="text-cyan-300">{protocolType}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </aside>
        </div>
      </main>

      {/* 統一封包檢視器 - 使用 BatchPacketViewer 處理所有連線 */}
      {showBatchViewer && batchViewerConnection && (
        <BatchPacketViewer
          aggregatedConnection={batchViewerConnection}
          playbackProgress={floodTimeProgress}
          isAttackTraffic={isAttackTraffic}
          activeParticleIndices={activeParticleIndices}
          selectedPacketIndex={selectedPacketIndex}
          onPacketSelect={(index) => setSelectedPacketIndex(index)}
          preloadedPackets={connectionPackets}
          onStatisticsLoaded={(data) => {
            setFloodStatistics(data)
          }}
          onClose={() => {
            setShowBatchViewer(false)
            setBatchViewerConnection(null)
            setFloodStatistics(null)
            setFloodIntensity(0)
            setSelectedPacketIndex(null)
            setActiveParticleIndices(new Set())
            setSelectedConnectionId(null)
            setConnectionPackets(null)
          }}
        />
      )}

      {/* 時間軸控制面板 */}
      {(() => {
        const shouldShowControls = selectedConnectionId && particleSystemRef.current && connectionPackets
        return shouldShowControls
      })() && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-2xl px-4">
          <TimelineControls
            isPlaying={isGlobalPlaying}
            speed={globalSpeed}
            currentTime={(globalTimeDisplay / 1000).toFixed(2)}
            totalTime={(globalDuration / 1000).toFixed(2)}
            progress={globalDuration > 0 ? globalTimeDisplay / globalDuration : 0}
            packetCount={connectionPackets?.packets?.length || connectionPackets?.total_packets || 0}
            onPlayPause={handlePlayPause}
            onSpeedChange={handleSpeedChange}
            onSeek={handleSeek}
            onStepForward={handleStepForward}
            onStepBackward={handleStepBackward}
          />
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".pcap,.pcapng"
        className="hidden"
        onChange={handleFileUpload}
      />
    </div>
  )
}

