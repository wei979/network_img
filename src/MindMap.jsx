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
  EyeOff,
  BookOpen,
  GraduationCap,
  X
} from 'lucide-react'
import { ProtocolAnimationController } from './lib/ProtocolAnimationController'
import useAnimationLoop from './hooks/useAnimationLoop'
import useNodeLayout from './hooks/useNodeLayout'
import { getProtocolColor, PROTOCOL_COLORS, PROTOCOL_LINE_STYLES, DEFAULT_LINE_STYLE } from './lib/ProtocolStates'
import PacketParticleSystem from './lib/PacketParticleSystem'
import { parseTimelineId, clamp, calculateCanvasSize, FORCE_PARAMS, calculateDynamicForceParams, calculateForces, applyForces, buildNodeLayout } from './lib/graphLayout.js'
import { truncateIpLabel, getDepthLabel, computeSearchMatchedNodeIds, computeSearchMatchedConnectionIds } from './lib/nodeDashboard.js'
import { computeConnectionHealth, computeNodeDegreeHealth, computeOverallHealthWithNodes, buildOverviewHealthFromDetailed, computeOverallHealthFromMapWithNodes } from './lib/connectionHealth.js'
// PacketViewer 已整合到 BatchPacketViewer，不再單獨使用
import BatchPacketViewer from './components/BatchPacketViewer'
import TimelineControls from './components/TimelineControls'
import FloodParticleSystem from './components/FloodParticleSystem'
import ProtocolFilter from './components/ProtocolFilter'
import ProtocolStatsPanel from './components/ProtocolStatsPanel'
import PerformanceScorePanel from './components/PerformanceScorePanel'
import HeaderToolbar from './components/HeaderToolbar'
import NodesTab from './components/NodesTab'
import HealthTab from './components/HealthTab'
import SecurityPanel from './components/SecurityPanel'
import TlsInfoPanel from './components/TlsInfoPanel'
import StreamViewer from './components/StreamViewer'

// 學習模組導入
import { LearningModeProvider, useLearningModeOptional } from './learning/LearningModeProvider'
import { LearningStorage } from './learning/LearningStorage'
import { useLearningActionDetector } from './learning/useLearningActionDetector'
import TutorialOverlay from './learning/TutorialOverlay'
import CourseSidebar from './learning/CourseSidebar'
import TheoryModal from './learning/TheoryModal'
import QuizModal from './learning/QuizModal'
import WrongAnswerReview from './learning/WrongAnswerReview'
import { getCourse, courseList } from './learning/courses'

const API_TIMELINES_URL = '/api/timelines'
const STATIC_TIMELINES_URL = '/data/protocol_timeline_sample.json'
const API_ANALYZE_URL = '/api/analyze'

// 自動檢測後端 API 是否可用，不再依賴環境變數
const ANALYZER_API_ENABLED = true

// 攻擊類型嚴重度排序（越前面越嚴重），供 buildAggregatedConnections 選出 worst-case protocolType
const FLOOD_SEVERITY_ORDER = ['urg-psh-fin-flood', 'ack-fin-flood', 'syn-flood', 'rst-flood', 'ack-flood', 'psh-flood', 'fin-flood', 'tcp-flood', 'timeout']

// 將每個 protocolType 對映到篩選器群組（tcp/udp/http/dns/icmp）
const PROTOCOL_GROUP_MAP = {
  'tcp-handshake': 'tcp', 'tcp-teardown': 'tcp', 'tcp-data': 'tcp',
  'tcp-session': 'tcp', 'timeout': 'tcp',
  'syn-flood': 'tcp', 'fin-flood': 'tcp', 'ack-flood': 'tcp',
  'rst-flood': 'tcp', 'psh-flood': 'tcp', 'ack-fin-flood': 'tcp',
  'urg-psh-fin-flood': 'tcp', 'tcp-flood': 'tcp', 'ssh-secure': 'tcp',
  'udp-transfer': 'udp',
  'http-request': 'http', 'https-request': 'http',
  'dns-query': 'dns',
  'icmp-ping': 'icmp',
}

// PROTOCOL_COLORS, PROTOCOL_LINE_STYLES, DEFAULT_LINE_STYLE are imported from ProtocolStates.js

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

// truncateIpLabel imported from './lib/nodeDashboard.js'

// 動態畫布尺寸計算（依據節點數量與複雜度）
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

// 工具函數與數學運算（clamp, calculateCanvasSize, FORCE_PARAMS, calculateDynamicForceParams imported from ./lib/graphLayout.js）

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


// calculateForces, applyForces, buildNodeLayout are imported from ./lib/graphLayout.js


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
  const connections = Array.from(aggregatedMap.values()).map(agg => {
    // 合成 worst-case metrics：掃描所有子連線，取最嚴重值
    const synthesizedMetrics = (() => {
      const m = {}
      let hasAny = false
      for (const child of agg.connections) {
        const cm = child.metrics
        if (!cm) continue
        hasAny = true
        if (cm.isFlood) m.isFlood = true
        if (typeof cm.synRatio === 'number') m.synRatio = Math.max(m.synRatio ?? 0, cm.synRatio)
        if (typeof cm.pshRatio === 'number') m.pshRatio = Math.max(m.pshRatio ?? 0, cm.pshRatio)
        if (typeof cm.finRatio === 'number') m.finRatio = Math.max(m.finRatio ?? 0, cm.finRatio)
        if (typeof cm.urgRatio === 'number') m.urgRatio = Math.max(m.urgRatio ?? 0, cm.urgRatio)
        if (typeof cm.ackRatio === 'number') m.ackRatio = Math.max(m.ackRatio ?? 0, cm.ackRatio)
        if (typeof cm.rstRatio === 'number') m.rstRatio = Math.max(m.rstRatio ?? 0, cm.rstRatio)
        if (typeof cm.rttMs === 'number') m.rttMs = Math.max(m.rttMs ?? 0, cm.rttMs)
        if (typeof cm.timeoutMs === 'number') m.timeoutMs = Math.max(m.timeoutMs ?? 0, cm.timeoutMs)
        if (typeof cm.responseTimeMs === 'number') m.responseTimeMs = Math.max(m.responseTimeMs ?? 0, cm.responseTimeMs)
        if (typeof cm.teardownDurationMs === 'number') m.teardownDurationMs = Math.max(m.teardownDurationMs ?? 0, cm.teardownDurationMs)
      }
      if (!hasAny) return null
      m.packetCount = agg.totalPackets
      return m
    })()

    // primaryProtocolType 優先級：依嚴重度挑出最惡劣的協議類型
    const firstConn = agg.connections[0]
    const worstProtocolType = (() => {
      for (const sev of FLOOD_SEVERITY_ORDER) {
        if (agg.connections.some(c => c.protocolType === sev)) return sev
      }
      return firstConn?.protocolType ?? 'unknown'
    })()

    return {
      ...agg,
      protocols: Array.from(agg.protocols),
      // 計算線條粗細（基於連線數量，範圍 1-10）
      strokeWidth: Math.min(1 + Math.log10(agg.connectionCount) * 2, 10),
      // 主要協議（使用最多的協議）
      primaryProtocol: firstConn?.protocol ?? 'unknown',
      primaryProtocolType: worstProtocolType,
      // 合成的 worst-case metrics，供健康評分使用
      metrics: synthesizedMetrics,
      // 使用第一條子連線的 originalId 來獲取 renderState（修復遠景顯示 ?? 問題）
      originalId: firstConn?.originalId ?? null
    }
  })

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
  return PROTOCOL_COLORS[protocol?.toLowerCase()] || '#706b61'
}

export default function MindMap({ isLearningMode = false }) {
  const [timelines, setTimelines] = useState([])
  const [sourceFiles, setSourceFiles] = useState([])
  const [generatedAt, setGeneratedAt] = useState(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const [attackAnalysis, setAttackAnalysis] = useState(null) // 攻擊分析數據
  const [protocolFilters, setProtocolFilters] = useState({ tcp: true, udp: true, http: true, dns: true, icmp: true })

  // ========== 學習模式狀態 ==========
  const [showLearningUI, setShowLearningUI] = useState(isLearningMode)
  const [currentCourse, setCurrentCourse] = useState(null)
  const [currentLevelId, setCurrentLevelId] = useState('level1')
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [showTutorialOverlay, setShowTutorialOverlay] = useState(isLearningMode)
  const [showCourseSidebar, setShowCourseSidebar] = useState(isLearningMode)
  const [showTheoryModal, setShowTheoryModal] = useState(false)
  const [theoryComponent, setTheoryComponent] = useState(null)
  const [showQuizModal, setShowQuizModal] = useState(false)
  const [currentQuiz, setCurrentQuiz] = useState(null)
  const [quizResults, setQuizResults] = useState({})
  const [showWrongAnswerReview, setShowWrongAnswerReview] = useState(false)
  const learningStartTimeRef = useRef(null)

  // 同步外部 isLearningMode 屬性
  useEffect(() => {
    setShowLearningUI(isLearningMode)
    setShowTutorialOverlay(isLearningMode)
    setShowCourseSidebar(isLearningMode)
    if (isLearningMode) {
      // 載入進度
      const progress = LearningStorage.getProgress()
      setCurrentLevelId(`level${progress.currentLevel}`)
      setCurrentLessonIndex(progress.currentLesson)
      setCurrentStepIndex(progress.currentStep)
      // 載入課程
      const course = getCourse(`level${progress.currentLevel}`)
      setCurrentCourse(course)
      // 記錄開始時間
      learningStartTimeRef.current = Date.now()
    }
  }, [isLearningMode])
  const fileInputRef = useRef(null)

  // Sidebar 可調整寬度
  const [sidebarWidth, setSidebarWidth] = useState(320)
  const isResizingRef = useRef(false)
  const gridRef = useRef(null)
  const MIN_SIDEBAR_WIDTH = 240
  const MAX_SIDEBAR_WIDTH = 600

  // Sidebar resize cleanup on unmount
  useEffect(() => {
    return () => {
      if (isResizingRef.current) {
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
        isResizingRef.current = false
      }
    }
  }, [])

  // 視圖與節點拖曳狀態
  const svgRef = useRef(null)
  const [viewTransform, setViewTransform] = useState({ scale: 1, tx: 0, ty: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const panStartRef = useRef({ x: 0, y: 0 })
  const isPanningRef = useRef(false)
  // A2-2: Node layout extracted to custom hook (declared after canvasSize below)

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
  const animationTimestampRef = useRef(0)

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
  const [searchQuery, setSearchQuery] = useState('')
  const [sidebarTab, setSidebarTab] = useState('nodes') // 'nodes' | 'health' | 'stats' | 'security' | 'tls'
  const [geoInfo, setGeoInfo] = useState({})
  const [followStreamId, setFollowStreamId] = useState(null) // Phase 8: TCP stream viewer

  // ========== 學習模式導航處理 ==========
  const getCurrentStep = useCallback(() => {
    if (!currentCourse) return null
    const lesson = currentCourse.lessons[currentLessonIndex]
    if (!lesson) return null
    return lesson.steps[currentStepIndex] || null
  }, [currentCourse, currentLessonIndex, currentStepIndex])

  const getCurrentLesson = useCallback(() => {
    if (!currentCourse) return null
    return currentCourse.lessons[currentLessonIndex] || null
  }, [currentCourse, currentLessonIndex])

  const getTotalStepsInLesson = useCallback(() => {
    const lesson = getCurrentLesson()
    return lesson ? lesson.steps.length : 0
  }, [getCurrentLesson])

  const handleLearningNext = useCallback(() => {
    if (!currentCourse) return

    const lesson = currentCourse.lessons[currentLessonIndex]
    if (!lesson) return

    // 還有下一步
    if (currentStepIndex < lesson.steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1)
      LearningStorage.updatePosition(
        parseInt(currentLevelId.replace('level', '')),
        currentLessonIndex,
        currentStepIndex + 1
      )
    } else {
      // 課節完成，進入下一課節
      LearningStorage.markLessonComplete(currentLevelId, lesson.id)
      if (currentLessonIndex < currentCourse.lessons.length - 1) {
        setCurrentLessonIndex(prev => prev + 1)
        setCurrentStepIndex(0)
        LearningStorage.updatePosition(
          parseInt(currentLevelId.replace('level', '')),
          currentLessonIndex + 1,
          0
        )
      } else {
        // 整個關卡完成
        const nextLevel = parseInt(currentLevelId.replace('level', '')) + 1
        LearningStorage.unlockLevel(nextLevel)
        // 關卡完成，已解鎖下一關
      }
    }
  }, [currentCourse, currentLessonIndex, currentStepIndex, currentLevelId])

  const handleLearningPrev = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1)
      LearningStorage.updatePosition(
        parseInt(currentLevelId.replace('level', '')),
        currentLessonIndex,
        currentStepIndex - 1
      )
    } else if (currentLessonIndex > 0) {
      // 返回上一課節的最後一步
      setCurrentLessonIndex(prev => prev - 1)
      if (currentCourse) {
        const prevLesson = currentCourse.lessons[currentLessonIndex - 1]
        if (prevLesson) {
          setCurrentStepIndex(prevLesson.steps.length - 1)
          LearningStorage.updatePosition(
            parseInt(currentLevelId.replace('level', '')),
            currentLessonIndex - 1,
            prevLesson.steps.length - 1
          )
        }
      }
    }
  }, [currentCourse, currentLessonIndex, currentStepIndex, currentLevelId])

  const handleLearningSkip = useCallback(() => {
    handleLearningNext()
  }, [handleLearningNext])

  // 顯示理論課彈窗
  const handleShowTheory = useCallback((componentName) => {
    if (componentName) {
      setTheoryComponent(componentName)
      setShowTheoryModal(true)
    }
  }, [])

  // 關閉理論課彈窗
  const handleCloseTheory = useCallback(() => {
    setShowTheoryModal(false)
    setTheoryComponent(null)
  }, [])

  // 理論課完成後進入下一步
  const handleTheoryComplete = useCallback(() => {
    handleLearningNext()
  }, [handleLearningNext])

  // ========== 測驗相關處理 ==========

  // 開始測驗
  const handleStartQuiz = useCallback((quiz, levelId) => {
    if (quiz) {
      setCurrentQuiz({ ...quiz, levelId })
      setShowQuizModal(true)
    }
  }, [])

  // 關閉測驗彈窗
  const handleCloseQuiz = useCallback(() => {
    setShowQuizModal(false)
    setCurrentQuiz(null)
  }, [])

  // 測驗完成
  const handleQuizComplete = useCallback((result) => {
    if (!result || !currentQuiz?.levelId) return

    // 儲存測驗結果
    setQuizResults(prev => ({
      ...prev,
      [currentQuiz.levelId]: {
        ...result,
        date: new Date().toISOString()
      }
    }))

    // 儲存到 localStorage
    LearningStorage.saveQuizScore(
      currentQuiz.id,
      result.percentage,
      result.passed
    )

    // 如果通過，解鎖下一關並標記當前關卡完成
    if (result.passed) {
      const levelNumber = parseInt(currentQuiz.levelId.replace('level', ''))
      LearningStorage.unlockLevel(levelNumber + 1)
      LearningStorage.markLevelComplete(currentQuiz.levelId)
    }

    setShowQuizModal(false)
    setCurrentQuiz(null)
  }, [currentQuiz])

  const handleSelectLevel = useCallback((levelId) => {
    const course = getCourse(levelId)
    if (course) {
      setCurrentLevelId(levelId)
      setCurrentCourse(course)
      setCurrentLessonIndex(0)
      setCurrentStepIndex(0)
      LearningStorage.updatePosition(parseInt(levelId.replace('level', '')), 0, 0)
    }
  }, [])

  const handleSelectLesson = useCallback((lessonIndex) => {
    setCurrentLessonIndex(lessonIndex)
    setCurrentStepIndex(0)
    LearningStorage.updatePosition(
      parseInt(currentLevelId.replace('level', '')),
      lessonIndex,
      0
    )
  }, [currentLevelId])

  const handleCloseLearning = useCallback(() => {
    // 儲存學習時間
    if (learningStartTimeRef.current) {
      const elapsed = Date.now() - learningStartTimeRef.current
      LearningStorage.addLearningTime(elapsed)
    }
    setShowTutorialOverlay(false)
  }, [])

  // ========== 學習操作偵測 ==========
  // 監聽使用者操作並自動進入下一步
  // 動態畫布尺寸
  const [canvasSize, setCanvasSize] = useState(1000)

  // 篩選後的 timelines（依協定群組過濾）
  const filteredTimelines = useMemo(() => {
    const allActive = Object.values(protocolFilters).every(Boolean)
    if (allActive) return timelines
    return timelines.filter(t => {
      const group = PROTOCOL_GROUP_MAP[t.protocolType] ?? t.protocol?.toLowerCase() ?? 'tcp'
      const knownGroup = ['tcp', 'udp', 'http', 'dns', 'icmp'].includes(group) ? group : 'tcp'
      return protocolFilters[knownGroup] === true
    })
  }, [timelines, protocolFilters])

  // A2-2: Node layout hook (must be before useLearningActionDetector which reads draggingNodeId)
  const {
    nodePositions, setNodePositions,
    draggingNodeId, setDraggingNodeId, draggingNodeIdRef,
    isLayoutStable, nodesComputed,
    needsFitToView, setNeedsFitToView,
  } = useNodeLayout(filteredTimelines, canvasSize, timelines)

  useLearningActionDetector({
    currentStep: getCurrentStep(),
    onActionComplete: handleLearningNext,
    appState: {
      selectedConnectionId,
      hoveredConnectionId,
      draggingNodeId,
      viewTransform
    },
    isActive: showLearningUI && showTutorialOverlay
  })

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

    isPanningRef.current = true
    setIsPanning(true)
    setInertiaVelocity({ vx: 0, vy: 0 })
    panStartRef.current = { x: e.clientX, y: e.clientY }
    lastPanMoveRef.current = { x: e.clientX, y: e.clientY, time: performance.now() }
  }, [])

  const handleMouseMove = useCallback((e) => {
    if (draggingNodeIdRef.current) {
      const world = toWorldCoords(e.clientX, e.clientY)
      setNodePositions(prev => ({
        ...prev,
        [draggingNodeIdRef.current]: {
          x: clamp(world.x, VIEWBOX_PADDING, canvasSize - VIEWBOX_PADDING),
          y: clamp(world.y, VIEWBOX_PADDING, canvasSize - VIEWBOX_PADDING)
        }
      }))
      return
    }
    if (!isPanningRef.current) return

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
  }, [toWorldCoords, canvasSize])

  const handleMouseUp = useCallback(() => {
    if (isPanningRef.current && !draggingNodeIdRef.current) {
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

    isPanningRef.current = false
    draggingNodeIdRef.current = null
    setIsPanning(false)
    setDraggingNodeId(null)
  }, [canvasSize])

  // 全域 mouseup 偵測：確保在 SVG 外部放開滑鼠時也能停止平移/拖曳
  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp)
    return () => window.removeEventListener('mouseup', handleMouseUp)
  }, [handleMouseUp])

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

  // Wheel / touch 事件需以 { passive: false } 掛載，才能呼叫 preventDefault()。
  // React 的合成事件無法控制 passive 旗標，改用 DOM API 直接掛在 SVG 元素上。
  // 必須放在三個 touch handler 宣告之後，避免 temporal dead zone 錯誤。
  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    el.addEventListener('wheel', handleWheelZoom, { passive: false })
    el.addEventListener('touchstart', handleTouchStart, { passive: false })
    el.addEventListener('touchmove', handleTouchMove, { passive: false })
    el.addEventListener('touchend', handleTouchEnd, { passive: false })
    return () => {
      el.removeEventListener('wheel', handleWheelZoom)
      el.removeEventListener('touchstart', handleTouchStart)
      el.removeEventListener('touchmove', handleTouchMove)
      el.removeEventListener('touchend', handleTouchEnd)
    }
  }, [handleWheelZoom, handleTouchStart, handleTouchMove, handleTouchEnd])

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
    // Phase 12: fetch geo info
    fetch('/api/geo').then(r => r.ok ? r.json() : {}).then(setGeoInfo).catch(() => {})
  }, [])

  useEffect(() => {
    loadTimelines()
  }, [loadTimelines])

  // filteredTimelines moved up (before useNodeLayout)

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

  // A2-1: Animation loop extracted to custom hook (stable ref to avoid RAF restarts)
  const animationExternalRefsRef = useRef({})
  animationExternalRefsRef.current.isGlobalPlaying = isGlobalPlaying
  animationExternalRefsRef.current.globalSpeed = globalSpeed
  animationExternalRefsRef.current.globalDuration = globalDuration
  animationExternalRefsRef.current.globalTimeRef = globalTimeRef
  animationExternalRefsRef.current.particleSystemRef = particleSystemRef
  animationExternalRefsRef.current.selectedConnectionIdRef = selectedConnectionIdRef
  animationExternalRefsRef.current.activeParticleIndices = activeParticleIndices
  animationExternalRefsRef.current.setGlobalTimeDisplay = setGlobalTimeDisplay
  animationExternalRefsRef.current.setParticleTimeInfo = setParticleTimeInfo
  animationExternalRefsRef.current.setActiveParticleIndices = setActiveParticleIndices
  const { renderStates, controllersRef } = useAnimationLoop(filteredTimelines, isPaused, animationExternalRefsRef)

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
      const now = Date.now()
      animationTimestampRef.current = now
      const elapsed = (now - startTime) % animationDuration
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

      // 同步全局時間軸長度到封包系統的實際時長
      // 必須無條件同步（而非只在更大時才更新），否則 scrubber 與封包動畫循環週期不一致
      const particleDuration = particleSystemRef.current.duration // 毫秒
      if (particleDuration > 0) {
        setGlobalDuration(particleDuration)
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

  // 取消選擇連線時還原全局時長、時間戳 refs 和 scrubber 位置到 timelines 計算值
  // 防止粒子系統的時長與絕對時間戳殘留，導致 scrubber 顯示 >100%
  useEffect(() => {
    // 有選中連線時由粒子系統接管，不干預
    if (connectionPackets) return
    if (!timelines.length) return
    let minTime = Infinity
    let maxTime = -Infinity
    timelines.forEach(timeline => {
      if (!Array.isArray(timeline.stages)) return
      timeline.stages.forEach(stage => {
        if (stage.startTime !== undefined) minTime = Math.min(minTime, stage.startTime)
        if (stage.endTime !== undefined) maxTime = Math.max(maxTime, stage.endTime)
      })
    })
    if (minTime === Infinity || maxTime === -Infinity) {
      globalStartTimestamp.current = 0
      globalEndTimestamp.current = 10
      setGlobalDuration(10000)
    } else {
      globalStartTimestamp.current = minTime
      globalEndTimestamp.current = maxTime
      const duration = (maxTime - minTime) * 1000
      setGlobalDuration(duration > 0 ? duration : 1000)
    }
    // 重置 scrubber 位置，避免殘留粒子系統的大時間值導致顯示 >100%
    globalTimeRef.current = 0
    setGlobalTimeDisplay(0)
  }, [connectionPackets, timelines])

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
    if (filteredTimelines.length === 0) return

    const nodeCount = new Set(
      filteredTimelines.flatMap(t => {
        const parsed = parseTimelineId(t)
        return parsed ? [parsed.src.ip, parsed.dst.ip] : []
      })
    ).size

    const connectionCount = filteredTimelines.length
    const newCanvasSize = calculateCanvasSize(nodeCount, connectionCount)

    setCanvasSize(newCanvasSize)
  }, [filteredTimelines])

  // baseNodes, force simulation, and nodesComputed are now in useNodeLayout hook
  const nodeMap = useMemo(() => {
    const map = new Map()
    nodesComputed.forEach((node) => map.set(node.id, node))
    return map
  }, [nodesComputed])

  const nodeHealthMap = useMemo(() => {
    const map = new Map()
    nodesComputed.forEach(node => {
      map.set(node.id, computeNodeDegreeHealth(node.connectionCount))
    })
    return map
  }, [nodesComputed])

  // 建立兩種連線列表：詳細版（每條獨立連線）和合併版（遠景模式用）
  const detailedConnections = useMemo(() => buildConnections(filteredTimelines), [filteredTimelines])
  const aggregatedConnections = useMemo(() => buildAggregatedConnections(filteredTimelines), [filteredTimelines])

  const overviewHealthMap = useMemo(
    () => buildOverviewHealthFromDetailed(detailedConnections, aggregatedConnections),
    [detailedConnections, aggregatedConnections]
  )

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

  // 健康評分（依 connections 陣列計算，sidebarTab 切換時即更新）
  const connectionHealthMap = useMemo(() => {
    if (!isFocusMode && !showBatchViewer) {
      return overviewHealthMap
    }
    const map = new Map()
    connections.forEach(c => map.set(c.id, computeConnectionHealth(c)))
    return map
  }, [connections, isFocusMode, showBatchViewer, overviewHealthMap])

  const overallHealth = useMemo(() => {
    const nodeResults = nodesComputed.map(n => nodeHealthMap.get(n.id)).filter(Boolean)
    if (!isFocusMode && !showBatchViewer) {
      return computeOverallHealthFromMapWithNodes(overviewHealthMap, nodeResults)
    }
    return computeOverallHealthWithNodes(connections, nodeResults)
  }, [connections, nodesComputed, nodeHealthMap, isFocusMode, showBatchViewer, overviewHealthMap])

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

  // 搜尋高亮：計算符合查詢的節點 ID 集合
  const searchMatchedNodeIds = useMemo(
    () => computeSearchMatchedNodeIds(nodesComputed, searchQuery),
    [searchQuery, nodesComputed]
  )

  // 搜尋高亮：計算符合查詢的連線 ID 集合
  const searchMatchedConnectionIds = useMemo(
    () => computeSearchMatchedConnectionIds(connections, searchMatchedNodeIds),
    [searchMatchedNodeIds, connections]
  )

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
    <div style={{ background: '#141311', color: '#e8e5df' }} className="flex min-h-screen">
      {/* ========== 學習模式：課程側邊欄 ========== */}
      {showLearningUI && showCourseSidebar && (
        <CourseSidebar
          currentLevelId={currentLevelId}
          currentLessonIndex={currentLessonIndex}
          onSelectLevel={handleSelectLevel}
          onSelectLesson={handleSelectLesson}
          onStartQuiz={handleStartQuiz}
          onOpenWrongAnswers={() => setShowWrongAnswerReview(true)}
          quizResults={quizResults}
          isVisible={showCourseSidebar}
        />
      )}

      {/* ========== 主要內容區域 ========== */}
      <div className="flex-1 overflow-auto">
      <HeaderToolbar
        uploading={uploading}
        error={error}
        generatedAt={generatedAt}
        sourceFiles={sourceFiles}
        isPaused={isPaused}
        isFocusMode={isFocusMode}
        selectedConnectionId={selectedConnectionId}
        showLearningUI={showLearningUI}
        showCourseSidebar={showCourseSidebar}
        showTutorialOverlay={showTutorialOverlay}
        onReload={loadTimelines}
        onTogglePause={() => setIsPaused(!isPaused)}
        onToggleFocus={() => {
          setIsFocusMode(!isFocusMode)
          if (!isFocusMode) { setIsPaused(true); setSearchQuery('') }
        }}
        onFollowStream={() => setFollowStreamId(selectedConnectionId)}
        onToggleCourseSidebar={() => setShowCourseSidebar(prev => !prev)}
        onToggleTutorial={() => setShowTutorialOverlay(prev => !prev)}
        fileInputRef={fileInputRef}
      />

      <main style={{ padding: '0 16px 16px' }}>
        <div ref={gridRef} className="grid gap-1" style={{ gridTemplateColumns: `1fr 6px ${sidebarWidth}px`, marginTop: 8 }}>
          <section style={{ background: '#1b1a17', border: '1px solid #2e2d2a', borderRadius: 4, padding: 16 }}>
            {loading ? (
              <div className="flex h-[calc(100vh-260px)] min-h-[400px] items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-slate-500" />
              </div>
            ) : connections.length === 0 ? (
              <div className="flex h-[calc(100vh-260px)] min-h-[400px] items-center justify-center text-sm text-slate-500">
                目前沒有協定時間軸資料。請上傳 PCAP/PCAPNG 擷取檔開始分析。
              </div>
            ) : showBatchViewer && batchViewerConnection ? (
              /* 近景模式：簡化的封包動畫視圖 */
              <div className="relative">
                {(() => {
                  // 解析連線資訊
                  const connId = batchViewerConnection.originalId || batchViewerConnection.id || ''
                  const parts = connId.replace('aggregated-', '').split('-')
                  // Flood 攻擊使用虛擬端口 0，此時僅顯示 IP 不顯示端口
                  const srcPort = parts[2]
                  const srcLabel = parts.length >= 3
                    ? (srcPort === '0' ? parts[1] : `${parts[1]}:${srcPort}`)
                    : batchViewerConnection.src || 'Source'
                  const dstLabel = parts.length >= 5 ? `${parts[3]}:${parts[4]}` : batchViewerConnection.dst || 'Destination'
                  const protocol = (parts[0] || 'TCP').toUpperCase()
                  const connectionCount = batchViewerConnection.connectionCount || 1
                  const isAttack = connectionCount > 50

                  // 根據連線類型決定節點標籤
                  // Flood 攻擊（虛擬端口 0）或高流量攻擊：使用攻擊者/目標
                  // 一般連線：使用中性的端點標籤（因為封包可能雙向流動）
                  const isFloodAttack = srcPort === '0'
                  const leftNodeLabel = isFloodAttack ? '攻擊者' : (isAttack ? '來源' : '端點 A')
                  const rightNodeLabel = isFloodAttack ? '目標' : (isAttack ? '目標' : '端點 B')

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
                      className="mindmap-svg-container w-full h-[calc(100vh-260px)] min-h-[400px]"
                      style={{ background: '#141311' }}
                    >
                      <defs>
                        <filter id="animNodeGlow" filterUnits="userSpaceOnUse">
                          <feGaussianBlur in="SourceGraphic" stdDeviation="0.3" result="blur" />
                          <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                          </feMerge>
                        </filter>
                        <linearGradient id="pathGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor={isAttack ? '#ef4444' : '#e05a33'} />
                          <stop offset="50%" stopColor={isAttack ? '#f97316' : '#b8452a'} />
                          <stop offset="100%" stopColor={isAttack ? '#ef4444' : '#e05a33'} />
                        </linearGradient>
                        <pattern id="animGrid" width="10" height="10" patternUnits="userSpaceOnUse">
                          <circle cx="5" cy="5" r="0.3" fill="#2e2d2a" opacity="0.4" />
                        </pattern>
                      </defs>

                      {/* 背景網格 */}
                      <rect width="100" height="100" fill="url(#animGrid)" />

                      {/* 標題 */}
                      <text x="50" y="8" textAnchor="middle" fill="#a09b91" fontSize="3" fontFamily="'DM Sans', sans-serif" fontWeight="500">
                        封包傳輸動畫
                      </text>
                      <text x="50" y="13" textAnchor="middle" fill="#e05a33" fontSize="2.2" fontFamily="'IBM Plex Mono', monospace">
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

                      {/* 左側節點（來源/攻擊者/端點 A） */}
                      <g transform={`translate(${srcX}, ${srcY})`}>
                        <circle r="5" fill="#1b1a17" stroke={isFloodAttack ? '#f97316' : '#e05a33'} strokeWidth="0.4" filter="url(#animNodeGlow)" />
                        <circle r="3.5" fill="#1b1a17" stroke={isFloodAttack ? '#fb923c' : '#b8452a'} strokeWidth="0.3" />
                        <text y="0.8" textAnchor="middle" fill={isFloodAttack ? '#f97316' : '#e8e5df'} fontSize="2" fontFamily="'DM Sans', sans-serif" fontWeight="700">{leftNodeLabel}</text>
                        <text y="10" textAnchor="middle" fill="#a09b91" fontSize="1.8" fontFamily="'IBM Plex Mono', monospace">{srcLabel}</text>
                      </g>

                      {/* 右側節點（目標/端點 B） */}
                      <g transform={`translate(${dstX}, ${dstY})`}>
                        <circle r="5" fill="#1b1a17" stroke={isAttack || isFloodAttack ? '#ef4444' : '#10b981'} strokeWidth="0.4" filter="url(#animNodeGlow)" />
                        <circle r="3.5" fill="#1b1a17" stroke={isAttack || isFloodAttack ? '#f87171' : '#34d399'} strokeWidth="0.3" />
                        <text y="0.8" textAnchor="middle" fill={isAttack || isFloodAttack ? '#f87171' : '#e8e5df'} fontSize="2" fontFamily="'DM Sans', sans-serif" fontWeight="700">{rightNodeLabel}</text>
                        <text y="10" textAnchor="middle" fill="#a09b91" fontSize="1.8" fontFamily="'IBM Plex Mono', monospace">{dstLabel}</text>
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
                          const phaseColor = particle.phase === 'spawn' ? '#e05a33' :
                                           particle.phase === 'arrive' ? '#a09b91' : particle.color

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
                                  stroke="#e05a33"
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
                                    stroke="#a09b91"
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
                                      stroke="#a09b91"
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
                                    fill="#1b1a17"
                                    fillOpacity="0.95"
                                    stroke={particle.phase === 'spawn' ? '#e05a33' :
                                           particle.phase === 'arrive' ? '#a09b91' : particle.color}
                                    strokeWidth="0.15"
                                  />
                                  <text
                                    x={point.x}
                                    y={point.y - displaySize - 1.8}
                                    textAnchor="middle"
                                    fill="#e8e5df" fontSize="1.6" fontFamily="'IBM Plex Mono', monospace" fontWeight="700"
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
                                fill="#a09b91" fontSize="1.4" fontFamily="'IBM Plex Mono', monospace" fontWeight="600"
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
                                  fill={particle.phase === 'spawn' ? '#e05a33' : '#a09b91'} fontSize="1.3" fontFamily="'DM Sans', sans-serif" fontWeight="700"
                                  style={{ pointerEvents: 'none' }}
                                >
                                  {particle.phase === 'spawn' ? '發送' : '收到'}
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
                        <rect x="0" y="0" width="25" height="18" rx="1" fill="#1b1a17" fillOpacity="0.9" stroke="#2e2d2a" strokeWidth="0.2" />
                        <text x="12.5" y="4" textAnchor="middle" fill="#a09b91" fontSize="1.8" fontFamily="'DM Sans', sans-serif">統計資訊</text>
                        <text x="2" y="8" fill="#706b61" fontSize="1.5" fontFamily="'DM Sans', sans-serif">連線數:</text>
                        <text x="23" y="8" textAnchor="end" fill="#e05a33" fontSize="1.5" fontFamily="'IBM Plex Mono', monospace">{connectionCount}</text>
                        <text x="2" y="11.5" fill="#706b61" fontSize="1.5" fontFamily="'DM Sans', sans-serif">封包數:</text>
                        <text x="23" y="11.5" textAnchor="end" fill="#e05a33" fontSize="1.5" fontFamily="'IBM Plex Mono', monospace">{connectionPackets?.total_packets || connectionPackets?.packets?.length || '—'}</text>
                        <text x="2" y="15" fill="#706b61" fontSize="1.5" fontFamily="'DM Sans', sans-serif">類型:</text>
                        <text x="23" y="15" textAnchor="end" fill={isAttack ? '#ef4444' : '#34d399'} fontSize="1.5" fontFamily="'IBM Plex Mono', monospace">{isAttack ? '攻擊流量' : '正常流量'}</text>
                      </g>

                      {/* 圖例 - 含生命週期階段 */}
                      <g transform="translate(65, 70)">
                        <rect x="0" y="0" width="32" height="28" rx="1" fill="#1b1a17" fillOpacity="0.9" stroke="#2e2d2a" strokeWidth="0.2" />
                        <text x="16" y="4" textAnchor="middle" fill="#a09b91" fontSize="1.8" fontFamily="'DM Sans', sans-serif">圖例</text>

                        {/* 封包類型 */}
                        <circle cx="4" cy="8" r="1" fill="#e05a33" />
                        <text x="7" y="8.5" fill="#a09b91" fontSize="1.2" fontFamily="'DM Sans', sans-serif">正常封包</text>
                        <circle cx="4" cy="11.5" r="1" fill="#ef4444" />
                        <text x="7" y="12" fill="#a09b91" fontSize="1.2" fontFamily="'DM Sans', sans-serif">異常/攻擊</text>
                        <circle cx="4" cy="15" r="1" fill="#22c55e" />
                        <text x="7" y="15.5" fill="#a09b91" fontSize="1.2" fontFamily="'DM Sans', sans-serif">SYN 連線</text>

                        {/* 生命週期階段 */}
                        <text x="2" y="19" fill="#706b61" fontSize="1.2" fontFamily="'DM Sans', sans-serif">生命週期:</text>
                        <circle cx="4" cy="22" r="0.8" fill="#e05a33" />
                        <circle cx="4" cy="22" r="1.3" fill="none" stroke="#e05a33" strokeWidth="0.1" />
                        <text x="7" y="22.5" fill="#e05a33" fontSize="1.1" fontFamily="'DM Sans', sans-serif">發送</text>
                        <circle cx="16" cy="22" r="0.8" fill="#a09b91" />
                        <circle cx="16" cy="22" r="1.3" fill="none" stroke="#a09b91" strokeWidth="0.1" strokeDasharray="0.3 0.3" />
                        <text x="19" y="22.5" fill="#a09b91" fontSize="1.1" fontFamily="'DM Sans', sans-serif">收到</text>

                        {/* 已選取 */}
                        <circle cx="4" cy="26" r="1" fill="#e05a33" stroke="#e05a33" strokeWidth="0.3" />
                        <text x="7" y="26.5" fill="#a09b91" fontSize="1.2" fontFamily="'DM Sans', sans-serif">已選取</text>
                      </g>
                    </svg>

                    {/* 返回遠景模式的提示 */}
                    <div className="absolute top-4 right-4 rounded px-3 py-2" style={{ background: '#1b1a17ee', border: '1px solid #3d3c38', borderRadius: 4 }}>
                      <div className="text-xs" style={{ color: '#a09b91' }}>
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
                  <div className="rounded px-3 py-2" style={{ background: '#1b1a17ee', border: '1px solid #3d3c38', borderRadius: 4 }}>
                    <div className="flex items-center gap-2 text-xs" style={{ color: '#a09b91' }}>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, color: '#e05a33' }}>
                        {Math.round(viewTransform.scale * 100)}%
                      </span>
                    </div>
                  </div>

                  {/* 縮放控制按鈕 */}
                  <div className="overflow-hidden" style={{ background: '#1b1a17ee', border: '1px solid #3d3c38', borderRadius: 4 }}>
                    <button
                      onClick={() => {
                        setViewTransform(prev => ({
                          ...prev,
                          scale: clamp(prev.scale * 1.2, 0.2, 5)
                        }))
                      }}
                      className="w-full px-3 py-2 transition-colors" style={{ color: '#e8e5df', borderBottom: '1px solid #2e2d2a' }}
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
                      className="w-full px-3 py-2 transition-colors" style={{ color: '#e8e5df' }}
                      title="縮小 (Zoom Out)"
                    >
                      <span className="text-lg font-bold">−</span>
                    </button>
                  </div>

                  {/* Reset View 按鈕 */}
                  <button
                    onClick={resetView}
                    className="rounded px-3 py-2 transition-colors" style={{ background: '#1b1a17ee', border: '1px solid #3d3c38', borderRadius: 4 }}
                    title="重置視圖 (Reset View)"
                  >
                    <RefreshCcw className="w-4 h-4" style={{ color: '#a09b91' }} />
                  </button>
                </div>

                <svg
                  ref={svgRef}
                  viewBox={`0 0 ${canvasSize} ${canvasSize}`}
                  className="w-full h-[calc(100vh-260px)] min-h-[400px]"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  style={{ background: '#141311', touchAction: 'none' }}
                >
                  <defs>
                    <filter id="nodeGlow" filterUnits="userSpaceOnUse">
                      <feGaussianBlur in="SourceGraphic" stdDeviation="0.3" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                    {/* 攻擊警告光暈濾鏡 */}
                    <filter id="attackWarningGlow" filterUnits="userSpaceOnUse" x="-100%" y="-100%" width="300%" height="300%">
                      <feGaussianBlur in="SourceGraphic" stdDeviation="1" result="blur1" />
                      <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur2" />
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
                      <feGaussianBlur in="SourceGraphic" stdDeviation="0.8" result="blur" />
                      <feColorMatrix in="blur" type="matrix" values="1 0 0 0 0.6  0 0 0 0 0.3  0 0 0 0 0  0 0 0 0.8 0" result="orangeBlur" />
                      <feMerge>
                        <feMergeNode in="orangeBlur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                    {/* 搜尋高亮螢光 - 節點 */}
                    <filter id="searchHighlightGlow" filterUnits="userSpaceOnUse" x="-100%" y="-100%" width="300%" height="300%">
                      <feGaussianBlur in="SourceGraphic" stdDeviation="0.8" result="blur1" />
                      <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur2" />
                      <feColorMatrix in="blur1" type="matrix" values="0 0 0 0 0  0 1 0 0 0.8  0 0 1 0 1  0 0 0 1 0" result="cyanBlur1" />
                      <feColorMatrix in="blur2" type="matrix" values="0 0 0 0 0  0 1 0 0 0.6  0 0 1 0 0.8  0 0 0 0.5 0" result="cyanBlur2" />
                      <feMerge>
                        <feMergeNode in="cyanBlur2" />
                        <feMergeNode in="cyanBlur1" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                    {/* 搜尋高亮螢光 - 連線 */}
                    <filter id="searchConnectionGlow" filterUnits="userSpaceOnUse" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur in="SourceGraphic" stdDeviation="0.5" result="blur" />
                      <feColorMatrix in="blur" type="matrix" values="0 0 0 0 0  0 1 0 0 0.6  0 0 1 0 0.8  0 0 0 0.8 0" result="cyanBlur" />
                      <feMerge>
                        <feMergeNode in="cyanBlur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                    {/* Swiss dot-grid background pattern */}
                    <pattern id="dotGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                      <circle cx="10" cy="10" r="0.4" fill="#2e2d2a" opacity="0.35" />
                    </pattern>
                  </defs>

                  {/* Dot-grid background */}
                  <rect width="100%" height="100%" fill="url(#dotGrid)" />

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

                    const midpoint = {
                      x: (adjustedFromPoint.x + adjustedToPoint.x) / 2,
                      y: (adjustedFromPoint.y + adjustedToPoint.y) / 2
                    }
                    const pathD = `M ${adjustedFromPoint.x} ${adjustedFromPoint.y} L ${adjustedToPoint.x} ${adjustedToPoint.y}`

                    const lineStyle = PROTOCOL_LINE_STYLES[protocolType] ?? DEFAULT_LINE_STYLE
                    const strokeDasharray = lineStyle.dashArray
                    const opacity = visualEffects.opacity ?? 1.0

                    const isHovered = hoveredConnectionId === connection.id
                    const isSelected = selectedConnectionId === connection.id
                    const isAggregated = connection.id?.startsWith('aggregated-')
                    const shouldShowLabel = isHovered || isSelected
                    const lineStrokeWidth = isSelected
                      ? lineStyle.strokeWidth * 2.0
                      : isHovered
                        ? lineStyle.strokeWidth * 1.5
                        : lineStyle.strokeWidth

                    // 聚焦模式：僅在 isFocusMode 啟用時隱藏非選中連線
                    if (isFocusMode && selectedConnectionId && !isSelected) return null

                    const isSearchActive = searchMatchedConnectionIds !== null
                    const isSearchMatch = isSearchActive ? searchMatchedConnectionIds.has(connection.id) : false

                    // 健康分頁：取得健康狀態，決定顏色覆蓋與 opacity
                    const connHealth = sidebarTab === 'health' ? (connectionHealthMap.get(connection.id) ?? { status: 'healthy' }) : null
                    const healthOpacityOverride = connHealth
                      ? connHealth.status === 'healthy' ? 0.3 : 1.0
                      : null

                    // 在健康分頁中，critical/warning 連線不受 hover 遮蔽（保持完整可見性）
                    const isHealthPriority = connHealth && connHealth.status !== 'healthy'
                    const isDimmedByHover = !isFocusMode && !isHealthPriority && hoveredConnectionId && !isHovered && !isSelected
                    const isDimmedBySearch = isSearchActive && !isSearchMatch && !isSelected

                    const finalOpacity = isDimmedBySearch
                      ? opacity * 0.1
                      : isDimmedByHover
                        ? opacity * 0.15
                        : healthOpacityOverride !== null
                          ? healthOpacityOverride
                          : opacity

                    return (
                      <g
                        key={connection.id}
                        className="mindmap-connection"
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
                            ? 1 + floodIntensity * 0.5 * Math.sin((animationTimestampRef.current || 0) / 200)
                            : 1
                          // 警告濾鏡：強度超過 50% 時套用；搜尋高亮時使用 searchConnectionGlow；健康分頁 critical 使用攻擊警告
                          const warningFilter = isSearchActive && isSearchMatch
                            ? 'url(#searchConnectionGlow)'
                            : isActiveFloodConnection && floodIntensity > 0.5
                              ? floodIntensity > 0.7 ? 'url(#attackWarningGlow)' : 'url(#attackWarningGlowMedium)'
                              : connHealth?.status === 'critical'
                                ? 'url(#attackWarningGlow)'
                                : undefined
                          // 高強度時使用紅色；健康分頁時依健康狀態覆蓋顏色
                          const strokeColor = isActiveFloodConnection && floodIntensity > 0.7
                            ? '#ef4444' // 紅色警告
                            : isActiveFloodConnection && floodIntensity > 0.5
                              ? '#f97316' // 橙色警告
                              : connHealth?.status === 'critical'
                                ? '#ef4444'
                                : connHealth?.status === 'warning'
                                  ? '#f59e0b'
                                  : color

                          // 搜尋命中時加粗連線
                          const searchStrokeMultiplier = isSearchActive && isSearchMatch ? 1.8 : 1

                          return (
                            <>
                              <path
                                d={pathD}
                                stroke={strokeColor}
                                strokeWidth={
                                  isAggregated
                                    ? (connection.strokeWidth || 1) * (isSelected ? 1.5 : isHovered ? 1.3 : 1) * pulseMultiplier * searchStrokeMultiplier
                                    : lineStrokeWidth * searchStrokeMultiplier
                                }
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeOpacity={finalOpacity * (isActiveFloodConnection ? 0.6 : 0.35)}
                                strokeDasharray={strokeDasharray || undefined}
                                fill="none"
                                filter={warningFilter}
                              />
                              {!isAggregated && lineStyle.double && (
                                <path
                                  d={pathD}
                                  stroke={strokeColor}
                                  strokeWidth={lineStrokeWidth * 0.5}
                                  strokeOpacity={finalOpacity * 0.4}
                                  fill="none"
                                  style={{ pointerEvents: 'none' }}
                                />
                              )}
                            </>
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

                        {/* 靜態中點標籤 - 僅在 hover 或 selected 時顯示 */}
                        {shouldShowLabel && (
                          <text
                            x={midpoint.x}
                            y={midpoint.y - 2}
                            textAnchor="middle"
                            fill="#e8e5df" fillOpacity="0.7" fontSize="1.8" fontFamily="'DM Sans', sans-serif"
                            style={{ pointerEvents: 'none' }}
                          >
                            {(protocolType || protocol).toUpperCase()}{isAggregated && connection.connectionCount > 1 ? ` (${connection.connectionCount})` : ''}
                          </text>
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
                                    fill="#e8e5df" fontSize="1.2" fontFamily="'IBM Plex Mono', monospace"
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
                    const outerFill = "#1b1a17"
                    const strokeWidth = node.isCenter ? 0.55 : 0.45

                    // 字體大小：SVG user units（跟隨 viewBox 與 zoom 縮放，非 CSS px）
                    const ipFontSize  = canvasSize / 75   // ~12 units at 900-unit canvas
                    const subFontSize = canvasSize / 100  // ~9 units for subtitle/protocol

                    // Label 位置（SVG user units，隨 viewBox 縮放）
                    const ipLabelY   = node.isCenter
                      ? node.y + outerRadius + ipFontSize * 1.4   // 中心節點：IP 在圓下方
                      : node.y - outerRadius - ipFontSize * 0.3   // 一般節點：IP 在圓上方
                    const subtitleY  = ipLabelY + ipFontSize * 1.3
                    const protocolY  = node.y + outerRadius + subFontSize * 1.4

                    // 搜尋高亮
                    const isNodeSearchMatch = searchMatchedNodeIds ? searchMatchedNodeIds.has(node.id) : false
                    const isNodeSearchActive = searchMatchedNodeIds !== null
                    const nodeOpacity = isNodeSearchActive && !isNodeSearchMatch ? 0.1 : 1.0
                    const nodeGlowFilter = isNodeSearchActive && isNodeSearchMatch
                      ? "url(#searchHighlightGlow)"
                      : "url(#nodeGlow)"

                    return (
                      <g key={node.id} className="mindmap-node" opacity={nodeOpacity} onMouseDown={(e) => { e.stopPropagation(); draggingNodeIdRef.current = node.id; setDraggingNodeId(node.id) }} style={{ cursor: node.isCenter ? 'default' : 'grab' }}>
                        <circle cx={node.x} cy={node.y} r={outerRadius} fill={outerFill} stroke="#2e2d2a" strokeWidth={strokeWidth} />
                        <circle cx={node.x} cy={node.y} r={innerRadius} fill="#222120" stroke={node.isCenter ? '#e05a33' : '#3d3c38'} strokeWidth={strokeWidth} filter={nodeGlowFilter} />
                        <text
                          x={node.x}
                          y={ipLabelY}
                          textAnchor="middle"
                          fontSize={ipFontSize}
                          fontWeight={node.isCenter ? "700" : "600"}
                          fill="#e8e5df"
                          fontFamily="'IBM Plex Mono', monospace"
                          style={{ pointerEvents: 'none' }}
                        >
                          {truncateIpLabel(node.label)}
                        </text>
                        {node.isCenter && (
                          <text
                            x={node.x}
                            y={subtitleY}
                            textAnchor="middle"
                            fontSize={subFontSize}
                            fontWeight="600"
                            fill="#a09b91"
                            fontFamily="'DM Sans', sans-serif"
                            style={{ pointerEvents: 'none' }}
                          >
                            網路中心
                          </text>
                        )}
                        {!node.isCenter && node.protocols.length > 0 && (
                          <text
                            x={node.x}
                            y={protocolY}
                            textAnchor="middle"
                            fontSize={subFontSize}
                            fill="#706b61"
                            fontFamily="'DM Sans', sans-serif"
                            style={{ textTransform: 'uppercase', pointerEvents: 'none' }}
                          >
                            {node.protocols.join(' · ')}
                          </text>
                        )}
                        {/* Phase 12: Geo label on SVG node */}
                        {!node.isCenter && geoInfo[node.label] && (
                          <text
                            x={node.x}
                            y={protocolY + subFontSize * 1.3}
                            textAnchor="middle"
                            fontSize={subFontSize * 0.85}
                            fill="#706b61"
                            fontFamily="'IBM Plex Mono', monospace"
                            style={{ pointerEvents: 'none' }}
                          >
                            {geoInfo[node.label].country_code || (geoInfo[node.label].type === 'private' ? 'LAN' : geoInfo[node.label].label)}
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
                      className="absolute pointer-events-none z-50 text-xs px-3 py-2"
                      style={{
                        background: '#1b1a17ee',
                        color: '#e8e5df',
                        border: '1px solid #3d3c38',
                        borderRadius: 4,
                        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                        left: `${tooltipPosition.x + 12}px`,
                        top: `${tooltipPosition.y - 12}px`,
                        transform: 'translate(-50%, -100%)'
                      }}
                    >
                      <div style={{ fontWeight: 600, color: '#e05a33', fontFamily: "'DM Sans', sans-serif" }}>{(protocolType || protocol).toUpperCase()}</div>
                      <div style={{ color: '#e8e5df', fontSize: 11, marginTop: 4 }}>階段: {stageLabel}</div>
                      <div style={{ color: '#a09b91', fontSize: 10, marginTop: 2 }}>進度: {progress}%</div>
                    </div>
                  )
                })()}
              </div>
            )}
          </section>

          {/* Sidebar Resize Handle */}
          <div
            className="cursor-col-resize group flex items-center justify-center self-stretch"
            onMouseDown={(e) => {
              e.preventDefault()
              isResizingRef.current = true
              document.body.style.cursor = 'col-resize'
              document.body.style.userSelect = 'none'

              const handleMouseMove = (moveEvent) => {
                if (!isResizingRef.current || !gridRef.current) return
                const gridRect = gridRef.current.getBoundingClientRect()
                const newWidth = gridRect.right - moveEvent.clientX
                setSidebarWidth(Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, newWidth)))
              }

              const handleMouseUp = () => {
                isResizingRef.current = false
                document.body.style.cursor = ''
                document.body.style.userSelect = ''
                document.removeEventListener('mousemove', handleMouseMove)
                document.removeEventListener('mouseup', handleMouseUp)
              }

              document.addEventListener('mousemove', handleMouseMove)
              document.addEventListener('mouseup', handleMouseUp)
            }}
          >
            <div style={{ width: 3, height: 32, borderRadius: 2, background: '#3d3c38', transition: 'background 0.15s' }} />
          </div>

          <aside style={{ background: '#1b1a17', border: '1px solid #2e2d2a', borderRadius: 4, padding: '12px 12px 12px 16px', display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 140px)' }}>
            {/* BigNumber header */}
            <div style={{ padding: '8px 4px 12px', display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 42, fontFamily: "'Instrument Serif', serif", fontWeight: 700, color: '#e8e5df', lineHeight: 1 }}>
                {nodesComputed.length}
              </span>
              <span style={{ fontSize: 13, color: '#706b61', fontFamily: "'DM Sans', sans-serif" }}>
                節點
              </span>
            </div>

            {/* 協定篩選器 */}
            <ProtocolFilter filters={protocolFilters} onFilterChange={setProtocolFilters} compact />

            {/* 分頁切換 */}
            {/* Swiss underline tabs */}
            <div role="tablist" aria-label="側欄分頁" style={{ display: 'flex', borderBottom: '1px solid #2e2d2a', marginBottom: 8 }}>
              {[
                { key: 'nodes', label: '節點' },
                { key: 'health', label: '健康' },
                { key: 'stats', label: '統計' },
                { key: 'security', label: '安全' },
                { key: 'tls', label: 'TLS' },
              ].map(tab => {
                const isActive = sidebarTab === tab.key
                return (
                  <button
                    key={tab.key}
                    type="button"
                    role="tab"
                    id={`tab-${tab.key}`}
                    aria-selected={isActive}
                    aria-controls={`panel-${tab.key}`}
                    onClick={() => setSidebarTab(tab.key)}
                    style={{
                      flex: 1,
                      padding: '9px 0',
                      fontSize: 11,
                      fontWeight: isActive ? 600 : 400,
                      color: isActive ? '#e8e5df' : '#706b61',
                      background: 'transparent',
                      border: 'none',
                      borderBottom: `2px solid ${isActive ? '#e05a33' : 'transparent'}`,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    {tab.label}
                  </button>
                )
              })}
            </div>

            {/* ======= 節點分頁 ======= */}
            {sidebarTab === 'nodes' && (
              <NodesTab
                nodesComputed={nodesComputed}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                searchMatchedNodeIds={searchMatchedNodeIds}
                searchMatchedConnectionIds={searchMatchedConnectionIds}
                geoInfo={geoInfo}
              />
            )}

            {/* ======= 健康分頁 ======= */}
            {sidebarTab === 'health' && (
              <HealthTab
                overallHealth={overallHealth}
                connections={connections}
                connectionHealthMap={connectionHealthMap}
                nodeHealthMap={nodeHealthMap}
                nodesComputed={nodesComputed}
                selectedConnectionId={selectedConnectionId}
                onSelectConnection={(connection, isSelected) => {
                  if (isSelected) {
                    setShowBatchViewer(false)
                    setBatchViewerConnection(null)
                    setSelectedConnectionId(null)
                    setConnectionPackets(null)
                  } else if (connection.id?.startsWith('aggregated-')) {
                    setShowBatchViewer(true)
                    setBatchViewerConnection(connection)
                    setSelectedConnectionId(connection.id)
                    if ((connection.connectionCount || 0) > 50) {
                      fetchBatchPacketsForAnimation(connection)
                    } else {
                      fetchConnectionPackets(connection.connections?.[0]?.originalId || connection.originalId)
                    }
                  } else {
                    setShowBatchViewer(true)
                    setBatchViewerConnection({ ...connection, connectionCount: 1, connections: [{ originalId: connection.originalId || connection.id, ...connection }] })
                    setSelectedConnectionId(connection.id)
                    fetchConnectionPackets(connection.originalId || connection.id)
                  }
                }}
              />
            )}

            {/* ======= 統計分頁 ======= */}
            {sidebarTab === 'stats' && (
              <div role="tabpanel" id="panel-stats" aria-labelledby="tab-stats" className="flex-1 overflow-y-auto">
                <ProtocolStatsPanel visible={sidebarTab === 'stats'} />
              </div>
            )}

            {/* ======= 安全分頁（合併專家+偵測） ======= */}
            {sidebarTab === 'security' && (
              <div role="tabpanel" id="panel-security" aria-labelledby="tab-security" className="flex-1 overflow-y-auto">
                <SecurityPanel
                  onSelectConnection={(stream) => {
                    if (stream) {
                      const connId = connections.find(c => c.id.includes(stream.split(':')[0]))?.id
                      if (connId) setSelectedConnectionId(connId)
                    }
                  }}
                />
              </div>
            )}

            {/* ======= TLS 分頁 ======= */}
            {sidebarTab === 'tls' && (
              <div role="tabpanel" id="panel-tls" aria-labelledby="tab-tls" className="flex-1 overflow-y-auto">
                <TlsInfoPanel />
              </div>
            )}
          </aside>
        </div>
      </main>

      {/* Phase 8: Follow TCP Stream viewer */}
      {followStreamId && (
        <StreamViewer
          connectionId={followStreamId}
          visible={!!followStreamId}
          onClose={() => setFollowStreamId(null)}
        />
      )}

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
      {/* end of flex-1 overflow-auto container */}

      {/* ========== 學習模式：教學引導覆蓋層 ========== */}
      {showLearningUI && showTutorialOverlay && (
        <TutorialOverlay
          step={getCurrentStep()}
          stepIndex={currentStepIndex}
          totalSteps={getTotalStepsInLesson()}
          lessonTitle={getCurrentLesson()?.title}
          onNext={handleLearningNext}
          onPrev={handleLearningPrev}
          onSkip={handleLearningSkip}
          onShowTheory={handleShowTheory}
          onClose={handleCloseLearning}
          isVisible={showTutorialOverlay}
        />
      )}

      {/* ========== 學習模式：理論課彈窗 ========== */}
      {showLearningUI && (
        <TheoryModal
          componentName={theoryComponent}
          stepTitle={getCurrentStep()?.title}
          stepContent={getCurrentStep()?.content}
          onClose={handleCloseTheory}
          onComplete={handleTheoryComplete}
          isVisible={showTheoryModal}
        />
      )}

      {/* ========== 學習模式：測驗彈窗 ========== */}
      {showLearningUI && (
        <QuizModal
          quiz={currentQuiz}
          onClose={handleCloseQuiz}
          onComplete={handleQuizComplete}
          isVisible={showQuizModal}
        />
      )}

      {/* ========== 學習模式：錯題回顧 ========== */}
      {showLearningUI && (
        <WrongAnswerReview
          isVisible={showWrongAnswerReview}
          onClose={() => setShowWrongAnswerReview(false)}
        />
      )}
    </div>
  )
}

