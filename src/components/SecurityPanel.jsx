import React, { useState, useEffect } from 'react'
import { Shield, AlertTriangle, Info, Loader2 } from 'lucide-react'

const SEVERITY_CONFIG = {
  error: { icon: '⊘', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', label: 'Error' },
  warning: { icon: '△', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', label: 'Warning' },
  note: { icon: '◎', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', label: 'Note' },
}

function ScoreBadge({ score }) {
  const color = score >= 60 ? 'text-red-400' : score >= 30 ? 'text-yellow-400' : 'text-green-400'
  return <span className={`font-mono font-bold ${color}`}>{score}/100</span>
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
        <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
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
      {/* ── 攻擊偵測摘要 ── */}
      <div className="rounded-xl p-3 bg-slate-800/50 border border-slate-700/60">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-semibold text-slate-200">攻擊偵測</span>
        </div>

        {det.detected ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-red-400 font-semibold">{det.type}</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                det.severity === 'high' ? 'bg-red-500/20 text-red-400'
                : det.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400'
                : 'bg-green-500/20 text-green-400'
              }`}>
                {det.severity === 'high' ? '高' : det.severity === 'medium' ? '中' : '低'}
              </span>
            </div>
            <p className="text-slate-400 leading-relaxed">{det.description}</p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <div className="text-slate-500">異常評分</div>
                <ScoreBadge score={det.anomaly_score || 0} />
              </div>
              <div>
                <div className="text-slate-500">信心度</div>
                <span className="font-mono text-slate-200">{((det.confidence || 0) * 100).toFixed(0)}%</span>
              </div>
              <div>
                <div className="text-slate-500">TCP 封包</div>
                <span className="font-mono text-slate-200">{(metrics.total_tcp_packets || 0).toLocaleString()}</span>
              </div>
              <div>
                <div className="text-slate-500">連線速率</div>
                <span className="font-mono text-slate-200">{metrics.connections_per_second || 0}/s</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 py-2">
            <Shield className="w-4 h-4 text-green-400" />
            <div>
              <div className="text-green-400 font-medium">未偵測到攻擊行為</div>
              <div className="text-slate-500 text-[10px]">
                {metrics.total_tcp_packets
                  ? `已分析 ${metrics.total_tcp_packets.toLocaleString()} 個 TCP 封包`
                  : '請先上傳 PCAP 檔案'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── 專家事件 ── */}
      <div className="rounded-xl bg-slate-800/50 border border-slate-700/60 flex flex-col min-h-0 flex-1">
        <div className="flex items-center justify-between px-3 pt-3 pb-1">
          <div className="flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-sm font-semibold text-slate-200">專家事件</span>
          </div>
          <span className="text-slate-500">{summary?.total || 0} events</span>
        </div>

        {/* Severity counts */}
        <div className="flex gap-2 px-3 py-1 text-[10px]">
          <span className="text-red-400">⊘ {summary?.errors || 0}</span>
          <span className="text-yellow-400">△ {summary?.warnings || 0}</span>
          <span className="text-blue-400">◎ {summary?.notes || 0}</span>
        </div>

        {/* Filter buttons */}
        <div className="flex gap-1 px-3 py-1.5">
          <button
            type="button"
            onClick={() => setActiveFilters({ error: true, warning: true, note: true })}
            className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
              Object.values(activeFilters).every(Boolean)
                ? 'bg-slate-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >All</button>
          {Object.entries(SEVERITY_CONFIG).map(([sev, cfg]) => (
            <button
              key={sev}
              type="button"
              onClick={() => toggleFilter(sev)}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                activeFilters[sev] ? `${cfg.bg} ${cfg.color} border ${cfg.border}` : 'bg-slate-800 text-slate-500 hover:bg-slate-700'
              }`}
            >{cfg.label}</button>
          ))}
        </div>

        {/* Event list */}
        <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1 custom-scrollbar">
          {filteredEvents.length === 0 ? (
            <div className="text-center text-slate-500 py-4">
              {events.length === 0 ? 'No expert info events detected' : 'No events match the current filter'}
            </div>
          ) : (
            filteredEvents.map((event, idx) => {
              const cfg = SEVERITY_CONFIG[event.severity] || SEVERITY_CONFIG.note
              return (
                <div
                  key={`${event.type}-${event.packetIndex}-${idx}`}
                  className={`px-2 py-1.5 rounded-lg border ${cfg.border} ${cfg.bg} cursor-pointer hover:brightness-125 transition-all`}
                  onClick={() => {
                    if (onSelectConnection && event.stream) {
                      onSelectConnection(event.stream)
                    }
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    <span className={`${cfg.color} font-semibold text-[11px]`}>{event.type}</span>
                    {event.packetIndex != null && (
                      <span className="text-slate-600 text-[9px]">#{event.packetIndex}</span>
                    )}
                  </div>
                  <div className="text-slate-400 text-[10px] leading-relaxed mt-0.5">{event.message}</div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
