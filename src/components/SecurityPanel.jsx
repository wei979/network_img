import React, { useState, useEffect } from 'react'
import { Shield, AlertTriangle, Info, Loader2 } from 'lucide-react'
import { S } from '../lib/swiss-tokens'

const SEVERITY_CONFIG = {
  error: { icon: '⊘', color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)', label: 'Error' },
  warning: { icon: '△', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)', label: 'Warning' },
  note: { icon: '◎', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.3)', label: 'Note' },
}

function ScoreBadge({ score }) {
  const color = score >= 60 ? '#ef4444' : score >= 30 ? '#f59e0b' : '#22c55e'
  return <span style={{ fontFamily: S.font.mono, fontWeight: 700, color }}>{score}/100</span>
}

export default function SecurityPanel({ onSelectConnection }) {
  const [attackData, setAttackData] = useState(null)
  const [events, setEvents] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeFilters, setActiveFilters] = useState({ error: true, warning: true, note: true })

  useEffect(() => {
    let cancelled = false
    const fetchAll = async () => {
      setLoading(true)
      try {
        const [attackRes, expertRes] = await Promise.all([
          fetch('/api/attacks').then(r => r.ok ? r.json() : null).catch(() => null),
          fetch('/api/expert-info').then(r => r.ok ? r.json() : null).catch(() => null),
        ])
        if (cancelled) return
        setAttackData(attackRes)
        setEvents(expertRes?.events || [])
        setSummary(expertRes?.summary || { total: 0, errors: 0, warnings: 0, notes: 0 })
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchAll()
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: S.text.tertiary }} />
      </div>
    )
  }

  const det = attackData?.attack_detection || {}
  const metrics = attackData?.metrics || {}
  const filteredEvents = events.filter(e => activeFilters[e.severity])

  const toggleFilter = (sev) => {
    setActiveFilters(prev => ({ ...prev, [sev]: !prev[sev] }))
  }

  return (
    <div className="flex flex-col gap-3 text-xs">
      {/* -- Attack detection summary -- */}
      <div className="rounded-[4px] p-3" style={{ background: S.surface, border: `1px solid ${S.border}` }}>
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-4 h-4" style={{ color: S.accent }} />
          <span className="text-sm font-semibold" style={{ color: S.text.primary }}>攻擊偵測</span>
        </div>

        {det.detected ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold" style={{ color: '#ef4444' }}>{det.type}</span>
              <span
                className="px-1.5 py-0.5 rounded-[3px] text-[10px] font-medium"
                style={
                  det.severity === 'high'
                    ? { background: 'rgba(239,68,68,0.2)', color: '#ef4444' }
                    : det.severity === 'medium'
                      ? { background: 'rgba(245,158,11,0.2)', color: '#f59e0b' }
                      : { background: 'rgba(34,197,94,0.2)', color: '#22c55e' }
                }
              >
                {det.severity === 'high' ? '高' : det.severity === 'medium' ? '中' : '低'}
              </span>
            </div>
            <p style={{ color: S.text.secondary }} className="leading-relaxed">{det.description}</p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <div style={{ color: S.text.tertiary }}>異常評分</div>
                <ScoreBadge score={det.anomaly_score || 0} />
              </div>
              <div>
                <div style={{ color: S.text.tertiary }}>信心度</div>
                <span style={{ fontFamily: S.font.mono, color: S.text.primary }}>{((det.confidence || 0) * 100).toFixed(0)}%</span>
              </div>
              <div>
                <div style={{ color: S.text.tertiary }}>TCP 封包</div>
                <span style={{ fontFamily: S.font.mono, color: S.text.primary }}>{(metrics.total_tcp_packets || 0).toLocaleString()}</span>
              </div>
              <div>
                <div style={{ color: S.text.tertiary }}>連線速率</div>
                <span style={{ fontFamily: S.font.mono, color: S.text.primary }}>{metrics.connections_per_second || 0}/s</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 py-2">
            <Shield className="w-4 h-4" style={{ color: '#22c55e' }} />
            <div>
              <div className="font-medium" style={{ color: '#22c55e' }}>未偵測到攻擊行為</div>
              <div className="text-[10px]" style={{ color: S.text.tertiary }}>
                {metrics.total_tcp_packets
                  ? `已分析 ${metrics.total_tcp_packets.toLocaleString()} 個 TCP 封包`
                  : '請先上傳 PCAP 檔案'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* -- Expert events -- */}
      <div className="rounded-[4px] flex flex-col min-h-0 flex-1" style={{ background: S.surface, border: `1px solid ${S.border}` }}>
        <div className="flex items-center justify-between px-3 pt-3 pb-1">
          <div className="flex items-center gap-2">
            <Info className="w-3.5 h-3.5" style={{ color: S.text.secondary }} />
            <span className="text-sm font-semibold" style={{ color: S.text.primary }}>專家事件</span>
          </div>
          <span style={{ color: S.text.tertiary }}>{summary?.total || 0} events</span>
        </div>

        {/* Severity counts */}
        <div className="flex gap-2 px-3 py-1 text-[10px]">
          <span style={{ color: '#ef4444' }}>⊘ {summary?.errors || 0}</span>
          <span style={{ color: '#f59e0b' }}>△ {summary?.warnings || 0}</span>
          <span style={{ color: '#3b82f6' }}>◎ {summary?.notes || 0}</span>
        </div>

        {/* Filter buttons */}
        <div className="flex gap-1 px-3 py-1.5">
          <button
            type="button"
            onClick={() => setActiveFilters({ error: true, warning: true, note: true })}
            className="px-2 py-0.5 rounded-[3px] text-[10px] font-medium transition-colors"
            style={
              Object.values(activeFilters).every(Boolean)
                ? { background: S.borderStrong, color: S.text.primary }
                : { background: S.bgRaised, color: S.text.secondary }
            }
          >All</button>
          {Object.entries(SEVERITY_CONFIG).map(([sev, cfg]) => (
            <button
              key={sev}
              type="button"
              onClick={() => toggleFilter(sev)}
              className="px-2 py-0.5 rounded-[3px] text-[10px] font-medium transition-colors"
              style={
                activeFilters[sev]
                  ? { background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }
                  : { background: S.bgRaised, color: S.text.tertiary }
              }
            >{cfg.label}</button>
          ))}
        </div>

        {/* Event list */}
        <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1 custom-scrollbar">
          {filteredEvents.length === 0 ? (
            <div className="text-center py-4" style={{ color: S.text.tertiary }}>
              {events.length === 0 ? 'No expert info events detected' : 'No events match the current filter'}
            </div>
          ) : (
            filteredEvents.map((event, idx) => {
              const cfg = SEVERITY_CONFIG[event.severity] || SEVERITY_CONFIG.note
              return (
                <div
                  key={`${event.type}-${event.packetIndex}-${idx}`}
                  className="px-2 py-1.5 rounded-[4px] cursor-pointer transition-all"
                  style={{
                    border: `1px solid ${cfg.border}`,
                    background: cfg.bg,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(1.25)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.filter = 'none' }}
                  onClick={() => {
                    if (onSelectConnection && event.stream) {
                      onSelectConnection(event.stream)
                    }
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-[11px]" style={{ color: cfg.color }}>{event.type}</span>
                    {event.packetIndex != null && (
                      <span className="text-[9px]" style={{ color: S.text.faint }}>{`#${event.packetIndex}`}</span>
                    )}
                  </div>
                  <div className="text-[10px] leading-relaxed mt-0.5" style={{ color: S.text.secondary }}>{event.message}</div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
