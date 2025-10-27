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

// 視圖與碰撞輔助函式
const clamp = (v, min, max) => Math.max(min, Math.min(max, v))

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

  const nodes = Array.from(endpoints.values())
  const radius = nodes.length > 1 ? Math.min(45, 28 + nodes.length * 1.2) : 0

  return nodes.map((node, index) => {
    const angle = (2 * Math.PI * index) / nodes.length
    const x = 50 + radius * Math.cos(angle)
    const y = 50 + radius * Math.sin(angle)
    return {
      id: node.id,
      label: node.ip,
      ports: Array.from(node.ports),
      protocols: Array.from(node.protocols),
      x,
      y
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
      scale: clamp(prev.scale * factor, 0.5, 3)
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
          x: clamp(world.x, 4, VIEWBOX_SIZE - 4),
          y: clamp(world.y, 4, VIEWBOX_SIZE - 4)
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
    const minDist = 8
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
            a.x = clamp(a.x - nx * push, 4, VIEWBOX_SIZE - 4)
            a.y = clamp(a.y - ny * push, 4, VIEWBOX_SIZE - 4)
            b.x = clamp(b.x + nx * push, 4, VIEWBOX_SIZE - 4)
            b.y = clamp(b.y + ny * push, 4, VIEWBOX_SIZE - 4)
          }
        }
      }
    }
    return positions
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
      controllersRef.current.forEach((controller, id) => {
        // 只有在未暫停時才推進動畫
        if (!isPaused) {
          controller.advance(delta)
        }
        nextStates[id] = controller.getRenderableState()
      })
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
  }, [timelines, isPaused])

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

  const nodes = useMemo(() => buildNodeLayout(timelines), [timelines])
// 以 baseNodes 初始化位置並使用 nodePositions 覆蓋
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

  const centralNode = nodesComputed.length === 1 ? nodesComputed[0] : null

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

                    // 焦點模式: 只顯示選中的連線
                    if (isFocusMode && selectedConnectionId && connection.id !== selectedConnectionId) {
                      return null
                    }

                    const renderState = renderStates[connection.id]
                    const protocolType = renderState?.protocolType || connection.protocolType
                    const color = renderState?.protocolColor || protocolColor(connection.protocol, protocolType)
                    const visualEffects = renderState?.visualEffects || {}

                    // 計算動畫圓點位置
                    const dotProgress = renderState?.dotPosition ?? renderState?.stageProgress ?? 0
                    const dotX = fromNode.x + (toNode.x - fromNode.x) * dotProgress
                    const dotY = fromNode.y + (toNode.y - fromNode.y) * dotProgress
                    const stageLabel = translateStageLabel(renderState?.currentStage?.label) || '??'

                    // 視覺效果樣式
                    const connectionStyle = renderState?.connectionStyle || 'solid'
                    const strokeDasharray = connectionStyle === 'dashed' ? '2,2' :
                                          connectionStyle === 'dotted' ? '1,1' : 'none'
                    const opacity = visualEffects.opacity ?? 1.0
                    const isBlinking = visualEffects.blinking
                    const isPulsing = visualEffects.pulsing
                    const isCompleted = renderState?.isCompleted

                    // 漸進式資訊揭露: 判斷是否要顯示標籤
                    const isHovered = hoveredConnectionId === connection.id
                    const isSelected = selectedConnectionId === connection.id
                    const shouldShowLabel = isHovered || isSelected

                    // 當有其他連線被 hover 時，降低此連線的透明度（焦點模式下不需要變暗）
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
                        onClick={() => setSelectedConnectionId(
                          selectedConnectionId === connection.id ? null : connection.id
                        )}
                        style={{ cursor: 'pointer' }}
                      >
                        <line
                          x1={fromNode.x}
                          y1={fromNode.y}
                          x2={toNode.x}
                          y2={toNode.y}
                          stroke={color}
                          strokeWidth={isSelected ? 2.4 : isHovered ? 2.0 : isCompleted ? 1.8 : 1.2}
                          strokeLinecap="round"
                          strokeOpacity={finalOpacity * 0.35}
                          strokeDasharray={strokeDasharray}
                        />

                        {/* 動畫圓點 */}
                        <circle
                          cx={dotX}
                          cy={dotY}
                          r={isSelected ? 2.8 : isPulsing ? 2.2 : 1.6}
                          fill={color}
                          filter="url(#nodeGlow)"
                          opacity={isBlinking ? 0.5 : finalOpacity}
                        >
                          {isPulsing && (
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

                        {/* 跟隨小球移動的文字標籤 - 總是顯示 */}
                        <text
                          x={dotX}
                          y={dotY - 3.5}
                          textAnchor="middle"
                          className="text-[2.2px] fill-slate-100 font-semibold"
                          style={{ pointerEvents: 'none' }}
                          opacity={finalOpacity}
                        >
                          {(protocolType || connection.protocol).toUpperCase()}
                        </text>
                        <text
                          x={dotX}
                          y={dotY - 1.8}
                          textAnchor="middle"
                          className="text-[1.8px] fill-cyan-300"
                          style={{ pointerEvents: 'none' }}
                          opacity={finalOpacity * 0.9}
                        >
                          {stageLabel}
                        </text>

                        {/* 協議和階段標籤 - 僅在 hover 或選中時顯示 */}
                        {shouldShowLabel && (
                          <>
                            <text
                              x={(fromNode.x + toNode.x) / 2}
                              y={(fromNode.y + toNode.y) / 2 - 2}
                              textAnchor="middle"
                              className="text-[2.8px] fill-slate-200 font-semibold"
                              style={{ pointerEvents: 'none' }}
                            >
                              {(protocolType || connection.protocol).toUpperCase()} · {stageLabel}
                            </text>

                            {/* 完成百分比 */}
                            <text
                              x={(fromNode.x + toNode.x) / 2}
                              y={(fromNode.y + toNode.y) / 2 + 2}
                              textAnchor="middle"
                              className={`text-[2.2px] ${isCompleted ? 'fill-green-400' : 'fill-slate-500'}`}
                              style={{ pointerEvents: 'none' }}
                            >
                              {Math.round((renderState?.timelineProgress || 0) * 100)}% {isCompleted ? '✓' : '完成'}
                            </text>
                          </>
                        )}
                      </g>
                    )
                  })}

                  {nodesComputed.map((node) => (
                    <g key={node.id} onMouseDown={(e) => { e.stopPropagation(); setDraggingNodeId(node.id) }} style={{ cursor: 'grab' }}>
                      <circle cx={node.x} cy={node.y} r={3.5} fill="#0f172a" stroke="#1f2937" strokeWidth={0.6} />
                      <circle cx={node.x} cy={node.y} r={2.6} fill="#1f2937" stroke="#38bdf8" strokeWidth={0.5} filter="url(#nodeGlow)" />
                      <text
                        x={node.x}
                        y={node.y - 5}
                        textAnchor="middle"
                        className="text-[2.5px] font-semibold fill-slate-100"
                      >
                        {node.label}
                      </text>
                      <text
                        x={node.x}
                        y={node.y + 6}
                        textAnchor="middle"
                        className="text-[2px] fill-cyan-300 uppercase tracking-wider"
                      >
                        {node.protocols.join(' · ')}
                      </text>
                    </g>
                  ))}

                  {centralNode && (
                    <g>
                      <circle cx={centralNode.x} cy={centralNode.y} r={10} fill="#0f172a" stroke="#1f2937" strokeWidth={0.4} />
                    </g>
                  )}

                  </g>
                </svg>

                {/* 漸進式資訊揭露: Level 2 懸浮提示框 */}
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

                // 漸進式資訊揭露: 當連線被選中時，在側邊欄高亮顯示
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

