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

const API_TIMELINES_URL = '/api/timelines'
const STATIC_TIMELINES_URL = '/data/protocol_timeline_sample.json'
const API_ANALYZE_URL = '/api/analyze'

// 自動檢測後端 API 是否可用，不再依賴環境變數
const ANALYZER_API_ENABLED = true

const PROTOCOL_COLORS = {
  tcp: '#38bdf8',
  udp: '#60a5fa',
  http: '#a855f7',
  https: '#14b8a6',
  dns: '#f97316',
  icmp: '#facc15',
  // 新增協議類型顏色
  'tcp-handshake': '#22c55e',
  'tcp-teardown': '#ef4444',
  'http-request': '#a855f7',
  'dns-query': '#f97316',
  'timeout': '#f59e0b',
  'udp-transfer': '#60a5fa',
  'icmp-ping': '#facc15',
  'ssh-secure': '#10b981'
}

const STAGE_LABEL_MAP = {
  'SYN Sent': 'SYN 送出',
  'SYN-ACK Received': 'SYN-ACK 收到',
  'ACK Confirmed': 'ACK 確認',
  'UDP Transfer': 'UDP 傳輸'
}

const translateStageLabel = (label) => STAGE_LABEL_MAP[label] ?? label

const VIEWBOX_SIZE = 100
const GRID_SIZE = 1000
const GRID_SPACING = 60
const GRID_CENTER = GRID_SIZE / 2
const GRID_SCALE = VIEWBOX_SIZE / GRID_SIZE
const GRID_SPACING_VIEW = GRID_SPACING * GRID_SCALE
const VIEWBOX_CENTER = {
  x: VIEWBOX_SIZE / 2,
  y: VIEWBOX_SIZE / 2
}

const BASE_SPREAD_MULTIPLIER = 5
const SPREAD_DECAY = 0.85

const NODE_OUTER_RADIUS = 2.2
const NODE_INNER_RADIUS = 1.4
const NODE_LABEL_OFFSET_TOP = 5
const NODE_PROTOCOL_OFFSET = 6
const CENTRAL_NODE_OUTER_RADIUS = NODE_OUTER_RADIUS * 1.7
const CENTRAL_NODE_INNER_RADIUS = NODE_INNER_RADIUS * 1.6
const CENTRAL_LABEL_OFFSET = NODE_LABEL_OFFSET_TOP + 4.2
const GRID_BOUND_MARGIN = Math.max(GRID_SPACING * BASE_SPREAD_MULTIPLIER * 0.3, 80)
const VIEWBOX_PADDING = NODE_OUTER_RADIUS * 3
const MIN_NODE_DISTANCE = Math.max(
  NODE_OUTER_RADIUS * 3,
  GRID_SPACING_VIEW * BASE_SPREAD_MULTIPLIER * 0.75
)

// 常用工具函數
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
    if (!isWithinSpreadBounds(slot)) {
      return
    }
    const key = `${x},${y}`
    if (seen.has(key)) {
      return
    }
    seen.add(key)
    slots.push({ ...slot, spread: applyGridSpread(slot) })
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


const parseTimelineId = (timeline) => {
  if (!timeline?.id) {
    return null
  }

  const parts = timeline.id.split('-')
  if (parts.length < 5) {
    return null
  }

  const [protocol, srcIp, srcPort, dstIp, dstPort] = parts
  return {
    protocol,
    src: { ip: srcIp, port: srcPort },
    dst: { ip: dstIp, port: dstPort }
  }
}

const buildNodeLayout = (timelines) => {
  const endpoints = new Map()

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
    }

    addEndpoint(parsed.src, timeline.protocol)
    addEndpoint(parsed.dst, timeline.protocol)
  })

  const nodes = Array.from(endpoints.values()).sort((a, b) =>
    a.ip.localeCompare(b.ip, undefined, { numeric: true, sensitivity: 'base' })
  )

  const slots = generateGridPositions(nodes.length)

  return nodes.map((node, index) => {
    const baseSlot = slots[index] || { x: GRID_CENTER, y: GRID_CENTER }
    const spreadPoint = baseSlot.spread || applyGridSpread(baseSlot)
    const clampedSpread = {
      x: clamp(spreadPoint.x, GRID_BOUND_MARGIN, GRID_SIZE - GRID_BOUND_MARGIN),
      y: clamp(spreadPoint.y, GRID_BOUND_MARGIN, GRID_SIZE - GRID_BOUND_MARGIN)
    }
    const x = gridToView(clampedSpread.x)
    const y = gridToView(clampedSpread.y)
    return {
      id: node.id,
      label: node.ip,
      ports: Array.from(node.ports),
      protocols: Array.from(node.protocols),
      x,
      y,
      gridPosition: baseSlot
    }
  })
}


const buildConnections = (timelines) => {
  return timelines
    .map((timeline) => {
      const parsed = parseTimelineId(timeline)
      if (!parsed) {
        return null
      }
      return {
        id: timeline.id,
        protocol: timeline.protocol,
        stages: timeline.stages,
        metrics: timeline.metrics,
        src: parsed.src.ip,
        dst: parsed.dst.ip
      }
    })
    .filter(Boolean)
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
  const controllersRef = useRef(new Map())
  const rafRef = useRef(null)
  const lastTickRef = useRef(performance.now())
  const [renderStates, setRenderStates] = useState({})
  const fileInputRef = useRef(null)

  // 視圖與節點拖曳狀態
  const svgRef = useRef(null)
  const [viewTransform, setViewTransform] = useState({ scale: 1, tx: 0, ty: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const panStartRef = useRef({ x: 0, y: 0 })
  const [nodePositions, setNodePositions] = useState({})
  const [draggingNodeId, setDraggingNodeId] = useState(null)

  // 互動狀態: 漸進式資訊揭露
  const [hoveredConnectionId, setHoveredConnectionId] = useState(null)
  const [selectedConnectionId, setSelectedConnectionId] = useState(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })

  // 動畫控制狀態
  const [isPaused, setIsPaused] = useState(false)
  const [isFocusMode, setIsFocusMode] = useState(false)

  useEffect(() => {
    if (draggingNodeId) {
      document.body.classList.add('no-select');
    } else {
      document.body.classList.remove('no-select');
    }
    return () => {
      document.body.classList.remove('no-select');
    };
  }, [draggingNodeId]);

  // LOD (Level of Detail) settings
  const scale = viewTransform.scale;
  const SHOW_NODE_THRESHOLD = 0.5;
  const SHOW_LABEL_THRESHOLD = 0.8;
  const SHOW_PACKET_THRESHOLD = 1.3;

  const showNodes = scale >= SHOW_NODE_THRESHOLD;
  const showLabels = scale >= SHOW_LABEL_THRESHOLD;
  const showPacketIcons = scale >= SHOW_PACKET_THRESHOLD;

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
    const direction = e.deltaY > 0 ? -1 : 1
    const factor = 1 + direction * 0.1
    setViewTransform(prev => ({
      ...prev,
      scale: clamp(prev.scale * factor, 0.2, 3)
    }))
  }, [])

  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return
    setIsPanning(true)
    panStartRef.current = { x: e.clientX, y: e.clientY }
  }, [])

  const handleMouseMove = useCallback((e) => {
    if (draggingNodeId) {
      const world = toWorldCoords(e.clientX, e.clientY)
      setNodePositions(prev => ({
        ...prev,
        [draggingNodeId]: {
          x: clamp(world.x, VIEWBOX_PADDING, VIEWBOX_SIZE - VIEWBOX_PADDING),
          y: clamp(world.y, VIEWBOX_PADDING, VIEWBOX_SIZE - VIEWBOX_PADDING)
        }
      }))
      return
    }
    if (!isPanning) return
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    const dx = e.clientX - panStartRef.current.x
    const dy = e.clientY - panStartRef.current.y
    panStartRef.current = { x: e.clientX, y: e.clientY }
    const deltaX = dx / rect.width * VIEWBOX_SIZE
    const deltaY = dy / rect.height * VIEWBOX_SIZE
    setViewTransform(prev => ({ ...prev, tx: prev.tx + deltaX, ty: prev.ty + deltaY }))
  }, [isPanning, draggingNodeId, toWorldCoords])

  const handleMouseUp = useCallback(() => {
    setIsPanning(false)
    setDraggingNodeId(null)
  }, [])

  const resolveCollisions = useCallback((positions) => {
    const ids = Object.keys(positions)
    const minDist = MIN_NODE_DISTANCE / viewTransform.scale; // Adjust collision distance with scale
    const iterations = 4
    for (let it = 0; it < iterations; it++) {
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          const a = positions[ids[i]]
          const b = positions[ids[j]]
          const dx = b.x - a.x
          const dy = b.y - a.y
          const dist = Math.hypot(dx, dy)
          if (dist > 0 && dist < minDist) {
            const push = (minDist - dist) / 2
            const nx = dx / dist
            const ny = dy / dist
            a.x = clamp(a.x - nx * push, VIEWBOX_PADDING, VIEWBOX_SIZE - VIEWBOX_PADDING)
            a.y = clamp(a.y - ny * push, VIEWBOX_PADDING, VIEWBOX_SIZE - VIEWBOX_PADDING)
            b.x = clamp(b.x + nx * push, VIEWBOX_PADDING, VIEWBOX_SIZE - VIEWBOX_PADDING)
            b.y = clamp(b.y + ny * push, VIEWBOX_PADDING, VIEWBOX_SIZE - VIEWBOX_PADDING)
          }
        }
      }
    }
    return positions
  }, [viewTransform.scale])

  const loadTimelines = useCallback(async () => {
    setLoading(true)
    setError(null)

    const fetchCandidate = async (url, useAuth = false) => {
      try {
        const headers = { 'Cache-Control': 'no-store' };
        if (useAuth) {
          const token = localStorage.getItem("authToken");
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }
        }
        const response = await fetch(url, { headers });
        if (!response.ok) {
          if (response.status === 401) {
            // Token is invalid or expired, force re-login
            localStorage.removeItem("authToken");
            window.location.reload();
          }
          return null
        }
        return await response.json()
      } catch (err) {
        return null
      }
    }

    let payload = null

    if (ANALYZER_API_ENABLED) {
      const apiPayload = await fetchCandidate(API_TIMELINES_URL, true)
      if (apiPayload?.timelines?.length) {
        payload = apiPayload
      }
    }

    if (!payload) {
      payload = await fetchCandidate(STATIC_TIMELINES_URL)
    }

    if (!payload || !Array.isArray(payload.timelines)) {
      setError('無法載入時間軸資料，請上傳 PCAP 檔案或檢查後端服務')
      setTimelines([])
      setSourceFiles([])
      setGeneratedAt(null)
      setLoading(false)
      return
    }

    setTimelines(payload.timelines)
    setSourceFiles(payload.sourceFiles || [])
    setGeneratedAt(payload.generatedAt || null)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadTimelines()
  }, [loadTimelines])

  useEffect(() => {
    if (!timelines.length) {
      controllersRef.current.clear()
      setRenderStates({})
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      return
    }

    const controllers = new Map()
    timelines.forEach((timeline) => {
      const controller = new ProtocolAnimationController(timeline)
      controller.reset()
      controllers.set(timeline.id, controller)
    })

    controllersRef.current = controllers
    lastTickRef.current = performance.now()

    const tick = (timestamp) => {
      const delta = timestamp - lastTickRef.current
      lastTickRef.current = timestamp

      const nextStates = {}
      if (showPacketIcons) { // Only update animations if they are visible
        controllersRef.current.forEach((controller, id) => {
          if (!isPaused) {
            controller.advance(delta)
          }
          nextStates[id] = controller.getRenderableState()
        })
      } else {
        // If packets are not shown, we can just grab the initial state
        controllersRef.current.forEach((controller, id) => {
          nextStates[id] = controller.getRenderableState()
        });
      }
      setRenderStates(nextStates)

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
  }, [timelines, isPaused, showPacketIcons])

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
      const token = localStorage.getItem("authToken");
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(API_ANALYZE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData
      })

      if (!response.ok) {
        if (response.status === 401) {
          // Token is invalid or expired, force re-login
          localStorage.removeItem("authToken");
          window.location.reload();
          return;
        }
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

  const baseNodes = useMemo(() => buildNodeLayout(timelines), [timelines])
  useEffect(() => {
    const initial = {}
    baseNodes.forEach(n => { initial[n.id] = { x: n.x, y: n.y } })
    setNodePositions(resolveCollisions({ ...initial }))
  }, [baseNodes, resolveCollisions])

  const nodesComputed = useMemo(() => baseNodes.map(n => ({ ...n, ...(nodePositions[n.id] || {}) })), [baseNodes, nodePositions])
  const nodeMap = useMemo(() => {
    const map = new Map()
    nodesComputed.forEach((node) => map.set(node.id, node))
    return map
  }, [nodesComputed])

  const connections = useMemo(() => buildConnections(timelines), [timelines])

  const centralNode = VIEWBOX_CENTER

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
            ) : (
              <div className="relative">
                <svg
                  ref={svgRef}
                  viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
                  className="w-full h-[480px] text-slate-400"
                  onWheel={handleWheelZoom}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                >
                  <defs>
                    <filter id="nodeGlow" filterUnits="userSpaceOnUse">
                      <feGaussianBlur in="SourceGraphic" stdDeviation="1" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
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

                    if (isFocusMode && selectedConnectionId && connection.id !== selectedConnectionId) {
                      return null
                    }

                    const renderState = renderStates[connection.id]
                    const protocolType = renderState?.protocolType || connection.protocolType
                    const color = renderState?.protocolColor || protocolColor(connection.protocol, protocolType)
                    const visualEffects = renderState?.visualEffects || {}
                    
                    const pathD = `M ${fromNode.x} ${fromNode.y} L ${VIEWBOX_CENTER.x} ${VIEWBOX_CENTER.y} L ${toNode.x} ${toNode.y}`

                    const isHovered = hoveredConnectionId === connection.id
                    const isSelected = selectedConnectionId === connection.id
                    const isDimmed = !isFocusMode && hoveredConnectionId && !isHovered && !isSelected
                    const finalOpacity = isDimmed ? 0.15 : 1.0;
                    
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
                        onClick={() => setSelectedConnectionId(
                          selectedConnectionId === connection.id ? null : connection.id
                        )}
                        style={{ cursor: 'pointer', opacity: finalOpacity }}
                      >
                        <path
                          d={pathD}
                          stroke={color}
                          strokeWidth={(isSelected ? 1.2 : isHovered ? 0.9 : 0.6) / scale}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeOpacity={0.5}
                          fill="none"
                        />

                        {showPacketIcons && renderState && (
                          <g>
                            <circle
                              cx={renderState.dotPosition.x}
                              cy={renderState.dotPosition.y}
                              r={ (isSelected ? 2.8 : 1.6) / scale }
                              fill={color}
                              filter="url(#nodeGlow)"
                            />
                            <text
                              x={renderState.dotPosition.x}
                              y={renderState.dotPosition.y - 6 / scale}
                              textAnchor="middle"
                              fontSize={8 / scale}
                              className="fill-slate-100 font-semibold"
                            >
                              {renderState.protocolType}
                            </text>
                             <text
                              x={renderState.dotPosition.x}
                              y={renderState.dotPosition.y + 6 / scale}
                              textAnchor="middle"
                              fontSize={6 / scale}
                              className="fill-cyan-300"
                            >
                              {translateStageLabel(renderState.currentStage?.label)}
                            </text>
                          </g>
                        )}
                      </g>
                    )
                  })}

                  {showNodes && nodesComputed.map((node) => (
                    <g key={node.id} onMouseDown={(e) => { e.stopPropagation(); setDraggingNodeId(node.id) }} style={{ cursor: 'grab' }}>
                      <circle cx={node.x} cy={node.y} r={NODE_OUTER_RADIUS / scale} fill="#0f172a" stroke="#1f2937" strokeWidth={0.45 / scale} />
                      <circle cx={node.x} cy={node.y} r={NODE_INNER_RADIUS / scale} fill="#1f2937" stroke="#38bdf8" strokeWidth={0.45 / scale} filter="url(#nodeGlow)" />
                      {showLabels && (
                        <>
                          <text
                            x={node.x}
                            y={node.y - (NODE_LABEL_OFFSET_TOP / scale)}
                            textAnchor="middle"
                            fontSize={6 / scale}
                            className="font-semibold fill-slate-100"
                          >
                            {node.label}
                          </text>
                          {node.protocols.length > 0 && (
                            <text
                              x={node.x}
                              y={node.y + (NODE_PROTOCOL_OFFSET / scale)}
                              textAnchor="middle"
                              fontSize={4 / scale}
                              className="fill-cyan-300 uppercase tracking-wide"
                            >
                              {node.protocols.join(' · ')}
                            </text>
                          )}
                        </>
                      )}
                    </g>
                  ))}

                  {centralNode && (
                     <g>
                      <circle cx={centralNode.x} cy={centralNode.y} r={CENTRAL_NODE_OUTER_RADIUS / scale} fill="#020617" stroke="#1f2937" strokeWidth={0.55 / scale} />
                      <circle cx={centralNode.x} cy={centralNode.y} r={CENTRAL_NODE_INNER_RADIUS / scale} fill="#1f2937" stroke="#38bdf8" strokeWidth={0.55 / scale} filter="url(#nodeGlow)" />
                       {showLabels && (
                         <text
                           x={centralNode.x}
                           y={centralNode.y + (CENTRAL_LABEL_OFFSET / scale)}
                           textAnchor="middle"
                           fontSize={7 / scale}
                           className="font-semibold fill-cyan-200"
                         >
                           網路中心
                         </text>
                       )}
                    </g>
                  )}

                  </g>
                </svg>

                {hoveredConnectionId && !selectedConnectionId && (() => {
                  const hoveredConn = connections.find(c => c.id === hoveredConnectionId)
                  if (!hoveredConn) return null
                  const renderState = renderStates[hoveredConnectionId]
                  const protocolType = renderState?.protocolType || hoveredConn.protocolType
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
                      <div className="font-semibold text-cyan-300">{(protocolType || hoveredConn.protocol).toUpperCase()}</div>
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
              {connections.map((connection) => {
                const renderState = renderStates[connection.id]
                const protocolType = renderState?.protocolType || connection.protocolType
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

                const isSelected = selectedConnectionId === connection.id

                return (
                  <div
                    key={connection.id}
                    onClick={() => setSelectedConnectionId(
                      selectedConnectionId === connection.id ? null : connection.id
                    )}
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
                          {(protocolType || connection.protocol).toUpperCase()}
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
