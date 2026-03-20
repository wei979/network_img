import React, { useState, useEffect, useRef, useMemo } from 'react'
import { Activity, AlertTriangle, Clock, Zap, TrendingUp, Server, Loader } from 'lucide-react'
import { S } from '../lib/swiss-tokens'
import { getAttackTypeStyle, getAttackTypeIconColor, getAttackTypeDescription, isAttackType } from '../lib/AttackTypes'

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
      <div className={className} style={{ background: S.surface, borderRadius: S.radius.md, border: `1px solid ${S.border}`, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, color: S.text.secondary }}>
          <Loader className="w-5 h-5 animate-spin" />
          <span>載入統計資料...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={className} style={{ background: `${S.protocol.ICMP}14`, borderRadius: S.radius.md, border: `1px solid ${S.protocol.ICMP}40`, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: S.protocol.ICMP }}>
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
  const attackStyle = getAttackTypeStyle(summary.attack_type)

  return (
    <div className={className} style={{ background: S.surface, borderRadius: S.radius.md, border: `1px solid ${S.border}`, overflow: 'hidden', fontFamily: S.font.sans }}>
      {/* 標題與攻擊類型標籤 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottom: `1px solid ${S.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Activity className="w-5 h-5" style={{ color: S.accent }} />
          <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: S.text.primary, margin: 0 }}>攻擊時間軸</h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* 威脅等級指示 */}
          {summary.threat_level && summary.threat_level !== 'low' && (
            <div style={{
              padding: '2px 8px', borderRadius: S.radius.sm, fontSize: '0.625rem', fontWeight: 500,
              background: summary.threat_level === 'high' ? `${S.protocol.ICMP}30` : '#f59e0b30',
              color: summary.threat_level === 'high' ? S.protocol.ICMP : '#fbbf24',
              border: `1px solid ${summary.threat_level === 'high' ? `${S.protocol.ICMP}50` : '#f59e0b50'}`,
            }}>
              {summary.threat_level === 'high' ? '高風險' : '中風險'}
            </div>
          )}
          {/* 攻擊類型標籤 */}
          <div style={{
            padding: '4px 12px', borderRadius: S.radius.sm, fontSize: '0.75rem', fontWeight: 600,
            background: attackStyle.background, color: attackStyle.color,
            border: `1px solid ${attackStyle.borderColor}`,
          }}>
            {summary.attack_type}
          </div>
        </div>
      </div>

      {/* 統計摘要 - 第一行：基本指標 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, padding: 16, borderBottom: `1px solid ${S.border}`, background: S.bgRaised }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, color: S.text.tertiary, fontSize: '0.75rem', marginBottom: 4 }}>
            <Server className="w-3 h-3" />
            連線數
          </div>
          <div style={{ fontSize: '1.125rem', fontWeight: 700, color: S.accent }}>
            {formatNumber(summary.total_connections)}
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, color: S.text.tertiary, fontSize: '0.75rem', marginBottom: 4 }}>
            <Zap className="w-3 h-3" />
            峰值封包率
          </div>
          <div style={{ fontSize: '1.125rem', fontWeight: 700, color: S.protocol.ICMP }}>
            {formatNumber(summary.peak_rate)}/s
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, color: S.text.tertiary, fontSize: '0.75rem', marginBottom: 4 }}>
            <TrendingUp className="w-3 h-3" />
            總封包數
          </div>
          <div style={{ fontSize: '1.125rem', fontWeight: 700, color: S.protocol.DNS }}>
            {formatNumber(summary.total_packets)}
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, color: S.text.tertiary, fontSize: '0.75rem', marginBottom: 4 }}>
            <Clock className="w-3 h-3" />
            持續時間
          </div>
          <div style={{ fontSize: '1.125rem', fontWeight: 700, color: S.protocol.HTTP }}>
            {summary.duration_seconds}s
          </div>
        </div>
      </div>

      {/* TCP 旗標分析 - 第二行：偵測依據 */}
      <div style={{ padding: 16, borderBottom: `1px solid ${S.border}`, background: S.bgRaised }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <AlertTriangle className="w-4 h-4" style={{ color: getAttackTypeIconColor(summary.attack_type) }} />
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: S.text.primary }}>TCP 旗標分析</span>
          {/* 異常分數 */}
          {summary.anomaly_score !== undefined && summary.anomaly_score > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 64, height: 6, background: S.borderStrong, borderRadius: 3, overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%', borderRadius: 3,
                    background: summary.anomaly_score >= 60 ? S.protocol.ICMP : summary.anomaly_score >= 30 ? '#f59e0b' : '#eab308',
                    width: `${summary.anomaly_score}%`,
                  }}
                />
              </div>
              <span style={{
                fontSize: '0.625rem', fontFamily: S.font.mono,
                color: summary.anomaly_score >= 60 ? S.protocol.ICMP : summary.anomaly_score >= 30 ? '#f59e0b' : '#eab308',
              }}>
                {summary.anomaly_score}
              </span>
            </div>
          )}
          <span style={{
            marginLeft: 'auto', fontSize: '0.75rem', padding: '2px 8px', borderRadius: S.radius.sm,
            background: isAttackType(summary.attack_type) ? `${S.protocol.ICMP}20` : summary.attack_type === 'Suspicious Traffic' ? '#f59e0b20' : `${S.protocol.HTTP}20`,
            color: isAttackType(summary.attack_type) ? S.protocol.ICMP : summary.attack_type === 'Suspicious Traffic' ? '#fbbf24' : S.protocol.HTTP,
          }}>
            {summary.attack_type === 'Normal Traffic' ? '流量正常' :
             summary.attack_type === 'Suspicious Traffic' ? '可疑流量' : '偵測到異常'}
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, fontSize: '0.75rem' }}>
          <div>
            <span style={{ color: S.text.tertiary, display: 'block', marginBottom: 4 }}>SYN 比例</span>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: summary.syn_ratio > 70 ? S.protocol.ICMP : summary.syn_ratio > 50 ? S.accent : S.text.primary }}>
              {summary.syn_ratio}%
            </div>
            <span style={{ color: S.text.faint, fontSize: '0.625rem' }}>
              {summary.syn_ratio > 70 ? '異常高' : summary.syn_ratio > 50 ? '偏高' : '正常'}
            </span>
          </div>
          <div>
            <span style={{ color: S.text.tertiary, display: 'block', marginBottom: 4 }}>FIN 比例</span>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: summary.fin_ratio > 70 ? S.protocol.ICMP : summary.fin_ratio > 50 ? S.accent : S.text.primary }}>
              {summary.fin_ratio || 0}%
            </div>
            <span style={{ color: S.text.faint, fontSize: '0.625rem' }}>
              {summary.fin_ratio > 70 ? '異常高' : summary.fin_ratio > 50 ? '偏高' : '正常'}
            </span>
          </div>
          <div>
            <span style={{ color: S.text.tertiary, display: 'block', marginBottom: 4 }}>RST 比例</span>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: summary.rst_ratio > 50 ? '#f59e0b' : summary.rst_ratio > 30 ? '#eab308' : S.text.primary }}>
              {summary.rst_ratio || 0}%
            </div>
            <span style={{ color: S.text.faint, fontSize: '0.625rem' }}>
              {summary.rst_ratio > 50 ? '連線異常' : summary.rst_ratio > 30 ? '偏高' : '正常'}
            </span>
          </div>
          <div>
            <span style={{ color: S.text.tertiary, display: 'block', marginBottom: 4 }}>ACK 比例</span>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: summary.ack_ratio < 20 ? '#f59e0b' : S.protocol.HTTP }}>
              {summary.ack_ratio || 0}%
            </div>
            <span style={{ color: S.text.faint, fontSize: '0.625rem' }}>
              {summary.ack_ratio < 20 ? '回應不足' : '正常回應'}
            </span>
          </div>
        </div>
        {/* 攻擊判定說明 */}
        {summary.attack_type !== 'Normal Traffic' && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${S.border}` }}>
            <p style={{ fontSize: '0.625rem', color: S.text.secondary, lineHeight: 1.6 }}>
              {summary.attack_type === 'SYN Flood' && (
                <>SYN 封包比例過高 ({summary.syn_ratio}%) 且缺少對應 ACK 回應，符合 SYN Flood 攻擊特徵。這種攻擊會耗盡目標伺服器的半開連線資源。</>
              )}
              {summary.attack_type === 'FIN Flood' && (
                <>FIN 封包比例過高 ({summary.fin_ratio || 0}%) 且 SYN 比例偏低 ({summary.syn_ratio}%)，符合 FIN Flood 攻擊特徵。攻擊者大量發送 FIN 封包嘗試消耗系統資源。</>
              )}
              {summary.attack_type === 'URG-PSH-FIN Attack' && (
                <>偵測到 URG-PSH-FIN 組合攻擊！
                  {summary.urg_psh_fin_ratio > 0 && ` 異常旗標組合封包佔 ${summary.urg_psh_fin_ratio}%`}
                  {summary.urg_ratio > 0 && `，URG 比例 ${summary.urg_ratio}%`}
                  {summary.psh_ratio > 0 && `，PSH 比例 ${summary.psh_ratio}%`}
                  。這種攻擊同時設置緊急(URG)、推送(PSH)、結束(FIN)旗標，會消耗 CPU 資源並可能繞過防火牆規則。
                </>
              )}
              {summary.attack_type === 'PSH Flood' && (
                <>PSH 封包比例過高 ({summary.psh_ratio || 0}%) 且 SYN 比例正常 ({summary.syn_ratio}%)，符合 PSH Flood 攻擊特徵。攻擊者發送大量 PSH 封包強制接收端立即處理資料，消耗 CPU 資源。</>
              )}
              {summary.attack_type === 'RST Attack' && (
                <>RST 封包比例過高 ({summary.rst_ratio || 0}%)，符合 RST 攻擊特徵。攻擊者大量發送 RST 封包強制關閉連線，可能導致服務中斷。</>
              )}
              {summary.attack_type === 'ACK Flood' && (
                <>ACK 封包比例極高 ({summary.ack_ratio || 0}%) 但 SYN 比例極低 ({summary.syn_ratio}%)，符合 ACK Flood 攻擊特徵。攻擊者發送大量 ACK 封包消耗頻寬與伺服器資源，正常流量應有對稱的 SYN-ACK 比例。</>
              )}
              {summary.attack_type === 'High Volume Attack' && (
                <>封包速率異常 ({formatNumber(summary.peak_rate)}/s)，可能為高流量 DDoS 攻擊或網路掃描行為。</>
              )}
              {summary.attack_type === 'Suspicious Traffic' && (
                <>偵測到可疑流量模式：
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
      <div style={{ padding: 16 }}>
        <svg
          ref={chartRef}
          width="100%"
          height={chartData.height}
          viewBox={`0 0 ${chartData.width} ${chartData.height}`}
          style={{ cursor: 'crosshair' }}
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
                stroke={`${S.border}30`}
                strokeWidth="1"
              />
            </pattern>
            <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={S.accent} stopOpacity="0.35" />
              <stop offset="100%" stopColor={S.accent} stopOpacity="0" />
            </linearGradient>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={S.accent} />
              <stop offset="50%" stopColor={S.protocol.ICMP} />
              <stop offset="100%" stopColor={S.accent} />
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
          <text x={chartData.padding.left - 10} y={chartData.padding.top} textAnchor="end"
            fill={S.text.tertiary} fontSize="10" fontFamily={S.font.mono}>
            {chartData.maxPacketCount}
          </text>
          <text x={chartData.padding.left - 10} y={chartData.padding.top + chartData.chartHeight / 2} textAnchor="end"
            fill={S.text.tertiary} fontSize="10" fontFamily={S.font.mono}>
            {Math.round(chartData.maxPacketCount / 2)}
          </text>
          <text x={chartData.padding.left - 10} y={chartData.padding.top + chartData.chartHeight} textAnchor="end"
            fill={S.text.tertiary} fontSize="10" fontFamily={S.font.mono}>
            0
          </text>

          {/* X 軸標籤 */}
          <text x={chartData.padding.left} y={chartData.height - 5} textAnchor="start"
            fill={S.text.tertiary} fontSize="10" fontFamily={S.font.mono}>
            0s
          </text>
          <text x={chartData.padding.left + chartData.chartWidth / 2} y={chartData.height - 5} textAnchor="middle"
            fill={S.text.tertiary} fontSize="10" fontFamily={S.font.mono}>
            {(summary.duration_seconds / 2).toFixed(1)}s
          </text>
          <text x={chartData.padding.left + chartData.chartWidth} y={chartData.height - 5} textAnchor="end"
            fill={S.text.tertiary} fontSize="10" fontFamily={S.font.mono}>
            {summary.duration_seconds}s
          </text>

          {/* 填充區域 */}
          <g clipPath="url(#animationClip)">
            <path d={chartData.areaPath} fill="url(#areaGradient)" />

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
              x1={hoveredPoint.x} y1={chartData.padding.top}
              x2={hoveredPoint.x} y2={chartData.padding.top + chartData.chartHeight}
              stroke={`${S.text.primary}50`}
              strokeWidth="1"
              strokeDasharray="4 2"
            />
          )}

          {/* Hover 點 */}
          {hoveredPoint && (
            <circle
              cx={hoveredPoint.x} cy={hoveredPoint.y}
              r="6" fill={S.protocol.ICMP} stroke={S.text.primary} strokeWidth="2"
            />
          )}

          {/* 選中的時間點 */}
          {selectedTimePoint && (
            <g>
              <line
                x1={selectedTimePoint.x} y1={chartData.padding.top}
                x2={selectedTimePoint.x} y2={chartData.padding.top + chartData.chartHeight}
                stroke={S.accent} strokeWidth="2"
              />
              <circle
                cx={selectedTimePoint.x} cy={selectedTimePoint.y}
                r="8" fill={S.accent} stroke={S.text.primary} strokeWidth="2"
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
                stroke={S.accent}
                strokeWidth="2"
              >
                <animate attributeName="stroke-opacity" values="1;0.5;1" dur="1s" repeatCount="indefinite" />
              </line>
              {/* 當前位置指示點 */}
              <circle
                cx={chartData.padding.left + chartData.chartWidth * playbackProgress}
                cy={chartData.padding.top - 8}
                r="4" fill={S.accent}
              >
                <animate attributeName="r" values="3;5;3" dur="1s" repeatCount="indefinite" />
              </circle>
            </g>
          )}
        </svg>

        {/* Hover 提示 */}
        {hoveredPoint && (
          <div style={{ marginTop: 8, padding: 12, background: S.bgRaised, borderRadius: S.radius.sm, border: `1px solid ${S.border}` }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, fontSize: '0.75rem' }}>
              <div>
                <span style={{ color: S.text.tertiary }}>時間</span>
                <div style={{ color: S.text.primary, fontFamily: S.font.mono }}>{hoveredPoint.data.time_seconds}s</div>
              </div>
              <div>
                <span style={{ color: S.text.tertiary }}>封包數</span>
                <div style={{ color: S.accent, fontFamily: S.font.mono }}>{hoveredPoint.data.packet_count}</div>
              </div>
              <div>
                <span style={{ color: S.text.tertiary }}>SYN</span>
                <div style={{ color: S.protocol.ICMP, fontFamily: S.font.mono }}>{hoveredPoint.data.syn_count}</div>
              </div>
              <div>
                <span style={{ color: S.text.tertiary }}>ACK</span>
                <div style={{ color: S.protocol.HTTP, fontFamily: S.font.mono }}>{hoveredPoint.data.ack_count}</div>
              </div>
            </div>
          </div>
        )}

        {/* 操作提示 */}
        <div style={{ marginTop: 12, textAlign: 'center', fontSize: '0.75rem', color: S.text.tertiary }}>
          移動滑鼠查看詳情，點擊選擇時間點查看該時段的代表連線
        </div>
      </div>
    </div>
  )
}
