import React, { useState, useEffect, useRef, useMemo } from 'react'
import { Activity, AlertTriangle, Clock, Zap, TrendingUp, Server, Loader } from 'lucide-react'

/**
 * AttackTimelineChart - 攻擊時間軸統計圖
 * 用於顯示 SYN Flood 等攻擊的封包率時間軸
 * 類似心電圖的視覺化效果
 */
export default function AttackTimelineChart({
  aggregatedConnection,
  onTimePointClick,
  className = ''
}) {
  const [statistics, setStatistics] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [hoveredPoint, setHoveredPoint] = useState(null)
  const [selectedTimePoint, setSelectedTimePoint] = useState(null)

  const chartRef = useRef(null)
  const animationRef = useRef(null)
  const [animationProgress, setAnimationProgress] = useState(0)

  // 取得連線 ID 列表
  const connectionIds = useMemo(() => {
    return aggregatedConnection?.connections?.map(c => c.originalId) || []
  }, [aggregatedConnection])

  // 載入統計資料
  useEffect(() => {
    if (connectionIds.length === 0) return

    const fetchStatistics = async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch('/api/packets/statistics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            connection_ids: connectionIds,
            time_bucket_ms: 50  // 50ms buckets for smooth visualization
          })
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()
        console.log('[AttackTimelineChart] Statistics loaded:', data.summary)
        setStatistics(data)

        // 開始動畫
        startAnimation()
      } catch (err) {
        console.error('[AttackTimelineChart] Failed to load statistics:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchStatistics()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [connectionIds])

  // 動畫效果
  const startAnimation = () => {
    const startTime = Date.now()
    const duration = 1500 // 1.5 秒完成動畫

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)

      // 使用 easeOutCubic 緩動函數
      const eased = 1 - Math.pow(1 - progress, 3)
      setAnimationProgress(eased)

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      }
    }

    animationRef.current = requestAnimationFrame(animate)
  }

  // 計算圖表路徑
  const chartData = useMemo(() => {
    if (!statistics?.timeline || statistics.timeline.length === 0) return null

    const timeline = statistics.timeline
    const maxPacketCount = Math.max(...timeline.map(t => t.packet_count), 1)

    // 圖表尺寸
    const width = 600
    const height = 150
    const padding = { top: 20, right: 20, bottom: 30, left: 50 }
    const chartWidth = width - padding.left - padding.right
    const chartHeight = height - padding.top - padding.bottom

    // 計算點位置
    const points = timeline.map((point, index) => ({
      x: padding.left + (index / (timeline.length - 1 || 1)) * chartWidth,
      y: padding.top + chartHeight - (point.packet_count / maxPacketCount) * chartHeight,
      data: point
    }))

    // 生成平滑曲線路徑 (使用 Catmull-Rom 樣條)
    const generateSmoothPath = (pts) => {
      if (pts.length < 2) return ''

      let path = `M ${pts[0].x} ${pts[0].y}`

      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[Math.max(0, i - 1)]
        const p1 = pts[i]
        const p2 = pts[i + 1]
        const p3 = pts[Math.min(pts.length - 1, i + 2)]

        // 控制點
        const cp1x = p1.x + (p2.x - p0.x) / 6
        const cp1y = p1.y + (p2.y - p0.y) / 6
        const cp2x = p2.x - (p3.x - p1.x) / 6
        const cp2y = p2.y - (p3.y - p1.y) / 6

        path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`
      }

      return path
    }

    // 生成填充區域路徑
    const generateAreaPath = (pts) => {
      const linePath = generateSmoothPath(pts)
      const baseY = padding.top + chartHeight
      return `${linePath} L ${pts[pts.length - 1].x} ${baseY} L ${pts[0].x} ${baseY} Z`
    }

    return {
      width,
      height,
      padding,
      chartWidth,
      chartHeight,
      maxPacketCount,
      points,
      linePath: generateSmoothPath(points),
      areaPath: generateAreaPath(points),
      timeline
    }
  }, [statistics])

  // 處理滑鼠移動
  const handleMouseMove = (e) => {
    if (!chartRef.current || !chartData) return

    const rect = chartRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const { padding, chartWidth, points } = chartData

    // 找到最近的點
    const relativeX = x - padding.left
    const index = Math.round((relativeX / chartWidth) * (points.length - 1))

    if (index >= 0 && index < points.length) {
      setHoveredPoint(points[index])
    }
  }

  // 處理點擊
  const handleClick = (e) => {
    if (!chartRef.current || !chartData) return

    const rect = chartRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const { padding, chartWidth, points } = chartData

    const relativeX = x - padding.left
    const index = Math.round((relativeX / chartWidth) * (points.length - 1))

    if (index >= 0 && index < points.length) {
      const point = points[index]
      setSelectedTimePoint(point)

      if (onTimePointClick) {
        onTimePointClick(point.data)
      }
    }
  }

  // 格式化數字
  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }

  // 格式化字節
  const formatBytes = (bytes) => {
    if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
    if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return bytes + ' B'
  }

  if (loading) {
    return (
      <div className={`bg-slate-800/70 rounded-xl border border-slate-700 p-6 ${className}`}>
        <div className="flex items-center justify-center gap-3 text-slate-400">
          <Loader className="w-5 h-5 animate-spin" />
          <span>載入統計資料...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-red-900/20 rounded-xl border border-red-500/30 p-6 ${className}`}>
        <div className="flex items-center gap-2 text-red-400">
          <AlertTriangle className="w-5 h-5" />
          <span>載入失敗：{error}</span>
        </div>
      </div>
    )
  }

  if (!statistics || !chartData) {
    return null
  }

  const { summary } = statistics

  return (
    <div className={`bg-slate-800/70 rounded-xl border border-slate-700 overflow-hidden ${className}`}>
      {/* 標題與攻擊類型標籤 */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-cyan-400" />
          <h3 className="text-sm font-semibold text-slate-200">攻擊時間軸</h3>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
          summary.attack_type === 'SYN Flood'
            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
            : summary.attack_type === 'High Volume Attack'
              ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
              : 'bg-green-500/20 text-green-400 border border-green-500/30'
        }`}>
          {summary.attack_type}
        </div>
      </div>

      {/* 統計摘要 */}
      <div className="grid grid-cols-4 gap-4 p-4 border-b border-slate-700 bg-slate-900/30">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-slate-500 text-xs mb-1">
            <Server className="w-3 h-3" />
            連線數
          </div>
          <div className="text-lg font-bold text-cyan-400">
            {formatNumber(summary.total_connections)}
          </div>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-slate-500 text-xs mb-1">
            <Zap className="w-3 h-3" />
            峰值封包率
          </div>
          <div className="text-lg font-bold text-red-400">
            {formatNumber(summary.peak_rate)}/s
          </div>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-slate-500 text-xs mb-1">
            <TrendingUp className="w-3 h-3" />
            SYN 比例
          </div>
          <div className="text-lg font-bold text-orange-400">
            {summary.syn_ratio}%
          </div>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-slate-500 text-xs mb-1">
            <Clock className="w-3 h-3" />
            持續時間
          </div>
          <div className="text-lg font-bold text-emerald-400">
            {summary.duration_seconds}s
          </div>
        </div>
      </div>

      {/* 圖表區域 */}
      <div className="p-4">
        <svg
          ref={chartRef}
          width="100%"
          height={chartData.height}
          viewBox={`0 0 ${chartData.width} ${chartData.height}`}
          className="cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredPoint(null)}
          onClick={handleClick}
        >
          {/* 背景網格 */}
          <defs>
            <pattern id="grid" width="40" height="30" patternUnits="userSpaceOnUse">
              <path
                d="M 40 0 L 0 0 0 30"
                fill="none"
                stroke="rgba(100, 116, 139, 0.1)"
                strokeWidth="1"
              />
            </pattern>
            <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(239, 68, 68, 0.4)" />
              <stop offset="100%" stopColor="rgba(239, 68, 68, 0)" />
            </linearGradient>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="50%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
            {/* 動畫遮罩 */}
            <clipPath id="animationClip">
              <rect
                x={chartData.padding.left}
                y="0"
                width={chartData.chartWidth * animationProgress}
                height={chartData.height}
              />
            </clipPath>
          </defs>

          {/* 背景 */}
          <rect
            x={chartData.padding.left}
            y={chartData.padding.top}
            width={chartData.chartWidth}
            height={chartData.chartHeight}
            fill="url(#grid)"
          />

          {/* Y 軸標籤 */}
          <text
            x={chartData.padding.left - 10}
            y={chartData.padding.top}
            textAnchor="end"
            className="fill-slate-500 text-[10px]"
          >
            {chartData.maxPacketCount}
          </text>
          <text
            x={chartData.padding.left - 10}
            y={chartData.padding.top + chartData.chartHeight / 2}
            textAnchor="end"
            className="fill-slate-500 text-[10px]"
          >
            {Math.round(chartData.maxPacketCount / 2)}
          </text>
          <text
            x={chartData.padding.left - 10}
            y={chartData.padding.top + chartData.chartHeight}
            textAnchor="end"
            className="fill-slate-500 text-[10px]"
          >
            0
          </text>

          {/* X 軸標籤 */}
          <text
            x={chartData.padding.left}
            y={chartData.height - 5}
            textAnchor="start"
            className="fill-slate-500 text-[10px]"
          >
            0s
          </text>
          <text
            x={chartData.padding.left + chartData.chartWidth / 2}
            y={chartData.height - 5}
            textAnchor="middle"
            className="fill-slate-500 text-[10px]"
          >
            {(summary.duration_seconds / 2).toFixed(1)}s
          </text>
          <text
            x={chartData.padding.left + chartData.chartWidth}
            y={chartData.height - 5}
            textAnchor="end"
            className="fill-slate-500 text-[10px]"
          >
            {summary.duration_seconds}s
          </text>

          {/* 填充區域 */}
          <g clipPath="url(#animationClip)">
            <path
              d={chartData.areaPath}
              fill="url(#areaGradient)"
            />

            {/* 主線條 */}
            <path
              d={chartData.linePath}
              fill="none"
              stroke="url(#lineGradient)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>

          {/* Hover 垂直線 */}
          {hoveredPoint && (
            <line
              x1={hoveredPoint.x}
              y1={chartData.padding.top}
              x2={hoveredPoint.x}
              y2={chartData.padding.top + chartData.chartHeight}
              stroke="rgba(255, 255, 255, 0.3)"
              strokeWidth="1"
              strokeDasharray="4 2"
            />
          )}

          {/* Hover 點 */}
          {hoveredPoint && (
            <circle
              cx={hoveredPoint.x}
              cy={hoveredPoint.y}
              r="6"
              fill="#ef4444"
              stroke="white"
              strokeWidth="2"
            />
          )}

          {/* 選中的時間點 */}
          {selectedTimePoint && (
            <g>
              <line
                x1={selectedTimePoint.x}
                y1={chartData.padding.top}
                x2={selectedTimePoint.x}
                y2={chartData.padding.top + chartData.chartHeight}
                stroke="#22d3ee"
                strokeWidth="2"
              />
              <circle
                cx={selectedTimePoint.x}
                cy={selectedTimePoint.y}
                r="8"
                fill="#22d3ee"
                stroke="white"
                strokeWidth="2"
              />
            </g>
          )}
        </svg>

        {/* Hover 提示 */}
        {hoveredPoint && (
          <div className="mt-2 p-3 bg-slate-900/80 rounded-lg border border-slate-600">
            <div className="grid grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-500">時間</span>
                <div className="text-slate-200 font-mono">{hoveredPoint.data.time_seconds}s</div>
              </div>
              <div>
                <span className="text-slate-500">封包數</span>
                <div className="text-cyan-400 font-mono">{hoveredPoint.data.packet_count}</div>
              </div>
              <div>
                <span className="text-slate-500">SYN</span>
                <div className="text-red-400 font-mono">{hoveredPoint.data.syn_count}</div>
              </div>
              <div>
                <span className="text-slate-500">ACK</span>
                <div className="text-green-400 font-mono">{hoveredPoint.data.ack_count}</div>
              </div>
            </div>
          </div>
        )}

        {/* 操作提示 */}
        <div className="mt-3 text-center text-xs text-slate-500">
          移動滑鼠查看詳情，點擊選擇時間點查看該時段的代表連線
        </div>
      </div>
    </div>
  )
}
