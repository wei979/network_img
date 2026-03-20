import React, { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { S } from '../lib/swiss-tokens'

const GRADE_COLORS = {
  'A+': '#34d399',
  'A': '#4ade80',
  'B': '#facc15',
  'C': '#fb923c',
  'D': '#f87171',
  'F': '#ef4444',
}

const RING_COLORS = {
  'A+': '#34d399',
  'A': '#4ade80',
  'B': '#facc15',
  'C': '#fb923c',
  'D': '#f87171',
  'F': '#ef4444',
}

function ScoreRing({ score, grade, size = 80 }) {
  const r = (size - 8) / 2
  const circumference = 2 * Math.PI * r
  const offset = circumference - (score / 100) * circumference
  const color = RING_COLORS[grade] || RING_COLORS.F

  return (
    <svg width={size} height={size} className="flex-shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={S.border} strokeWidth={4} />
      <circle cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={4}
        strokeDasharray={circumference} strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x={size / 2} y={size / 2 - 4} textAnchor="middle"
        fill={S.text.primary} fontSize={size * 0.22} fontWeight="bold">
        {score}
      </text>
      <text x={size / 2} y={size / 2 + 12} textAnchor="middle"
        fill={color} fontSize={size * 0.15} fontWeight="600">
        {grade}
      </text>
    </svg>
  )
}

function MetricCard({ label, score, grade, detail }) {
  const color = GRADE_COLORS[grade] || GRADE_COLORS.F
  return (
    <div className="flex-1 rounded-[4px] p-2 text-center" style={{ background: S.surface }}>
      <div className="text-[10px] mb-1" style={{ color: S.text.secondary }}>{label}</div>
      <div className="text-lg font-bold" style={{ color }}>{score}</div>
      <div className="text-[10px] font-semibold" style={{ color }}>{grade}</div>
      <div className="text-[9px] mt-0.5" style={{ color: S.text.tertiary }}>{detail}</div>
    </div>
  )
}

function formatBytes(bps) {
  if (bps >= 1048576) return `${(bps / 1048576).toFixed(1)} MB/s`
  if (bps >= 1024) return `${(bps / 1024).toFixed(1)} KB/s`
  return `${Math.round(bps)} B/s`
}

export default function PerformanceScorePanel() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch('/api/performance')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then(d => { if (!cancelled) setData(d) })
      .catch(() => { if (!cancelled) setData(null) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: S.text.tertiary }} />
      </div>
    )
  }

  if (!data || !data.overall) {
    return (
      <div className="text-center text-xs py-4" style={{ color: S.text.tertiary }}>
        請先上傳 PCAP 檔案以取得效能分析
      </div>
    )
  }

  const { overall, grade, latency, packet_loss, throughput } = data

  return (
    <div className="mb-3 rounded-[4px] p-3" style={{ background: S.surface, border: `1px solid ${S.border}` }}>
      <div className="flex items-center gap-3 mb-2">
        <ScoreRing score={overall} grade={grade} size={72} />
        <div>
          <div className="text-sm font-semibold" style={{ color: S.text.primary }}>網路效能</div>
          <div className="text-[10px]" style={{ color: S.text.secondary }}>延遲x40% + 丟包x35% + 吞吐x25%</div>
        </div>
      </div>
      <div className="flex gap-1.5">
        <MetricCard
          label="延遲"
          score={latency.score}
          grade={latency.grade}
          detail={latency.sample_count > 0 ? `${latency.avg_rtt_ms}ms` : 'N/A'}
        />
        <MetricCard
          label="丟包"
          score={packet_loss.score}
          grade={packet_loss.grade}
          detail={`${(packet_loss.retransmission_rate * 100).toFixed(1)}%`}
        />
        <MetricCard
          label="吞吐"
          score={throughput.score}
          grade={throughput.grade}
          detail={formatBytes(throughput.bytes_per_second)}
        />
      </div>
    </div>
  )
}
