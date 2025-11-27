import React, { useState, useEffect, useRef, useMemo } from 'react'
import { Activity, AlertTriangle, Clock, Zap, TrendingUp, Server, Loader } from 'lucide-react'
import { getAttackTypeClassName, getAttackTypeIconColor, getAttackTypeDescription, isAttackType } from '../lib/AttackTypes'

/**
 * AttackTimelineChart - 攻擊時間軸統計圖
 * 用於顯示 SYN Flood 等攻擊的封包率時間軸
 * 類似心電圖的視覺化效果
 */
export default function AttackTimelineChart({
  aggregatedConnection,
  onTimePointClick,
  // 播放進度 (0-1)，用於同步顯示
  playbackProgress = 0,
  // 統計資料載入完成的回調
  onStatisticsLoaded = null,
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

        // 通知父組件統計資料已載入
        if (onStatisticsLoaded) {
          onStatisticsLoaded(data)
        }

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
        <div className="flex items-center gap-2">
          {/* 威脅等級指示 */}
          {summary.threat_level && summary.threat_level !== 'low' && (
            <div className={`px-2 py-0.5 rounded text-[10px] font-medium ${
              summary.threat_level === 'high'
                ? 'bg-red-500/30 text-red-300 border border-red-500/40'
                : 'bg-amber-500/30 text-amber-300 border border-amber-500/40'
            }`}>
              {summary.threat_level === 'high' ? '高風險' : '中風險'}
            </div>
          )}
          {/* 攻擊類型標籤 */}
          <div className={`px-3 py-1 rounded-full text-xs font-semibold ${getAttackTypeClassName(summary.attack_type)} border`}>
            {summary.attack_type}
          </div>
        </div>
      </div>

      {/* 統計摘要 - 第一行：基本指標 */}
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
            總封包數
          </div>
          <div className="text-lg font-bold text-purple-400">
            {formatNumber(summary.total_packets)}
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

      {/* TCP 旗標分析 - 第二行：偵測依據 */}
      <div className="p-4 border-b border-slate-700 bg-slate-900/50">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className={`w-4 h-4 ${getAttackTypeIconColor(summary.attack_type)}`} />
          <span className="text-sm font-semibold text-slate-200">TCP 旗標分析</span>
          {/* 異常分數 */}
          {summary.anomaly_score !== undefined && summary.anomaly_score > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    summary.anomaly_score >= 60 ? 'bg-red-500' :
                    summary.anomaly_score >= 30 ? 'bg-amber-500' : 'bg-yellow-500'
                  }`}
                  style={{ width: `${summary.anomaly_score}%` }}
                />
              </div>
              <span className={`text-[10px] font-mono ${
                summary.anomaly_score >= 60 ? 'text-red-400' :
                summary.anomaly_score >= 30 ? 'text-amber-400' : 'text-yellow-400'
              }`}>
                {summary.anomaly_score}
              </span>
            </div>
          )}
          <span className={`ml-auto text-xs px-2 py-0.5 rounded ${
            isAttackType(summary.attack_type)
              ? 'bg-red-500/20 text-red-300'
              : summary.attack_type === 'Suspicious Traffic'
                ? 'bg-amber-500/20 text-amber-300'
                : 'bg-emerald-500/20 text-emerald-300'
          }`}>
            {summary.attack_type === 'Normal Traffic' ? '流量正常' :
             summary.attack_type === 'Suspicious Traffic' ? '可疑流量' : '偵測到異常'}
          </span>
        </div>
        <div className="grid grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-500 block mb-1">SYN 比例</span>
            <div className={`font-bold text-base ${
              summary.syn_ratio > 70 ? 'text-red-400' :
              summary.syn_ratio > 50 ? 'text-orange-400' : 'text-slate-300'
            }`}>
              {summary.syn_ratio}%
            </div>
            <span className="text-slate-600 text-[10px]">
              {summary.syn_ratio > 70 ? '異常高' : summary.syn_ratio > 50 ? '偏高' : '正常'}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block mb-1">FIN 比例</span>
            <div className={`font-bold text-base ${
              summary.fin_ratio > 70 ? 'text-red-400' :
              summary.fin_ratio > 50 ? 'text-orange-400' : 'text-slate-300'
            }`}>
              {summary.fin_ratio || 0}%
            </div>
            <span className="text-slate-600 text-[10px]">
              {summary.fin_ratio > 70 ? '異常高' : summary.fin_ratio > 50 ? '偏高' : '正常'}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block mb-1">RST 比例</span>
            <div className={`font-bold text-base ${
              summary.rst_ratio > 50 ? 'text-amber-400' :
              summary.rst_ratio > 30 ? 'text-yellow-400' : 'text-slate-300'
            }`}>
              {summary.rst_ratio || 0}%
            </div>
            <span className="text-slate-600 text-[10px]">
              {summary.rst_ratio > 50 ? '連線異常' : summary.rst_ratio > 30 ? '偏高' : '正常'}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block mb-1">ACK 比例</span>
            <div className={`font-bold text-base ${
              summary.ack_ratio < 20 ? 'text-amber-400' : 'text-emerald-400'
            }`}>
              {summary.ack_ratio || 0}%
            </div>
            <span className="text-slate-600 text-[10px]">
              {summary.ack_ratio < 20 ? '回應不足' : '正常回應'}
            </span>
          </div>
        </div>
        {/* 攻擊判定說明 */}
        {summary.attack_type !== 'Normal Traffic' && (
          <div className="mt-3 pt-3 border-t border-slate-700/50">
            <p className="text-[10px] text-slate-400 leading-relaxed">
              {summary.attack_type === 'SYN Flood' && (
                <>⚠️ SYN 封包比例過高 ({summary.syn_ratio}%) 且缺少對應 ACK 回應，符合 SYN Flood 攻擊特徵。這種攻擊會耗盡目標伺服器的半開連線資源。</>
              )}
              {summary.attack_type === 'FIN Flood' && (
                <>⚠️ FIN 封包比例過高 ({summary.fin_ratio || 0}%) 且 SYN 比例偏低 ({summary.syn_ratio}%)，符合 FIN Flood 攻擊特徵。攻擊者大量發送 FIN 封包嘗試消耗系統資源。</>
              )}
              {summary.attack_type === 'URG-PSH-FIN Attack' && (
                <>🔥 偵測到 URG-PSH-FIN 組合攻擊！
                  {summary.urg_psh_fin_ratio > 0 && ` 異常旗標組合封包佔 ${summary.urg_psh_fin_ratio}%`}
                  {summary.urg_ratio > 0 && `，URG 比例 ${summary.urg_ratio}%`}
                  {summary.psh_ratio > 0 && `，PSH 比例 ${summary.psh_ratio}%`}
                  。這種攻擊同時設置緊急(URG)、推送(PSH)、結束(FIN)旗標，會消耗 CPU 資源並可能繞過防火牆規則。
                </>
              )}
              {summary.attack_type === 'PSH Flood' && (
                <>⚠️ PSH 封包比例過高 ({summary.psh_ratio || 0}%) 且 SYN 比例正常 ({summary.syn_ratio}%)，符合 PSH Flood 攻擊特徵。攻擊者發送大量 PSH 封包強制接收端立即處理資料，消耗 CPU 資源。</>
              )}
              {summary.attack_type === 'RST Attack' && (
                <>⚠️ RST 封包比例過高 ({summary.rst_ratio || 0}%)，符合 RST 攻擊特徵。攻擊者大量發送 RST 封包強制關閉連線，可能導致服務中斷。</>
              )}
              {summary.attack_type === 'High Volume Attack' && (
                <>⚠️ 封包速率異常 ({formatNumber(summary.peak_rate)}/s)，可能為高流量 DDoS 攻擊或網路掃描行為。</>
              )}
              {summary.attack_type === 'Suspicious Traffic' && (
                <>⚡ 偵測到可疑流量模式：
                  {summary.fin_ratio > 40 && `FIN 比例偏高 (${summary.fin_ratio}%)`}
                  {summary.fin_ratio > 40 && summary.rst_ratio > 30 && '、'}
                  {summary.rst_ratio > 30 && `RST 比例偏高 (${summary.rst_ratio}%)`}
                  。建議持續監控，尚未達到明確攻擊閾值。
                </>
              )}
            </p>
          </div>
        )}
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

          {/* 播放進度指示器 */}
          {playbackProgress > 0 && playbackProgress < 1 && (
            <g>
              {/* 未播放區域遮罩（暗顯示） */}
              <rect
                x={chartData.padding.left + chartData.chartWidth * playbackProgress}
                y={chartData.padding.top}
                width={chartData.chartWidth * (1 - playbackProgress)}
                height={chartData.chartHeight}
                fill="rgba(0, 0, 0, 0.4)"
              />
              {/* 當前播放位置線 */}
              <line
                x1={chartData.padding.left + chartData.chartWidth * playbackProgress}
                y1={chartData.padding.top - 5}
                x2={chartData.padding.left + chartData.chartWidth * playbackProgress}
                y2={chartData.padding.top + chartData.chartHeight + 5}
                stroke="#22d3ee"
                strokeWidth="2"
              >
                <animate
                  attributeName="stroke-opacity"
                  values="1;0.5;1"
                  dur="1s"
                  repeatCount="indefinite"
                />
              </line>
              {/* 當前位置指示點 */}
              <circle
                cx={chartData.padding.left + chartData.chartWidth * playbackProgress}
                cy={chartData.padding.top - 8}
                r="4"
                fill="#22d3ee"
              >
                <animate
                  attributeName="r"
                  values="3;5;3"
                  dur="1s"
                  repeatCount="indefinite"
                />
              </circle>
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
