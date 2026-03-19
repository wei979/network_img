import React, { useState, useEffect } from 'react'
import { AlertTriangle, AlertCircle, Info, Loader2, Filter } from 'lucide-react'

const SEVERITY_CONFIG = {
  error: {
    icon: AlertCircle,
    color: 'text-red-500',
    border: 'border-red-500',
    bg: 'bg-red-500/10',
    badgeBg: 'bg-red-500/20',
    badgeText: 'text-red-400',
    label: 'Error',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-yellow-500',
    border: 'border-yellow-500',
    bg: 'bg-yellow-500/10',
    badgeBg: 'bg-yellow-500/20',
    badgeText: 'text-yellow-400',
    label: 'Warning',
  },
  note: {
    icon: Info,
    color: 'text-blue-400',
    border: 'border-blue-400',
    bg: 'bg-blue-400/10',
    badgeBg: 'bg-blue-400/20',
    badgeText: 'text-blue-300',
    label: 'Note',
  },
}

const getSeverityConfig = (severity) =>
  SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.note

const ExpertInfoPanel = ({ visible = true, onSelectConnection }) => {
  const [events, setEvents] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeFilters, setActiveFilters] = useState({
    error: true,
    warning: true,
    note: true,
  })

  useEffect(() => {
    let cancelled = false

    const fetchExpertInfo = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/expert-info')
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`)
        }
        const data = await res.json()
        if (!cancelled) {
          setEvents(data.events || [])
          setSummary(data.summary || null)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchExpertInfo()
    return () => {
      cancelled = true
    }
  }, [])

  const toggleFilter = (severity) => {
    setActiveFilters((prev) => ({ ...prev, [severity]: !prev[severity] }))
  }

  const filteredEvents = events.filter(
    (event) => activeFilters[event.severity] !== false
  )

  const activeFilterCount = Object.values(activeFilters).filter(Boolean).length

  if (!visible) {
    return null
  }

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-slate-700 bg-slate-800/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={14} className="text-slate-400" />
            <span className="text-xs font-semibold text-slate-200">
              Expert Info
            </span>
          </div>
          {summary && (
            <span className="text-xs text-slate-500">
              {summary.total} events
            </span>
          )}
        </div>
      </div>

      {/* Summary Bar */}
      {summary && !loading && !error && (
        <div className="px-3 py-2 border-b border-slate-700/60 bg-slate-900/40">
          <div className="flex items-center gap-3">
            {[
              { key: 'errors', severity: 'error' },
              { key: 'warnings', severity: 'warning' },
              { key: 'notes', severity: 'note' },
            ].map(({ key, severity }) => {
              const config = getSeverityConfig(severity)
              const Icon = config.icon
              const count = summary[key] || 0
              return (
                <div key={key} className="flex items-center gap-1">
                  <Icon size={11} className={config.color} />
                  <span className={`text-xs font-mono ${config.color}`}>
                    {count}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Filter Buttons */}
      <div className="px-3 py-2 border-b border-slate-700/60 bg-slate-850">
        <div className="flex items-center gap-1.5">
          <Filter size={11} className="text-slate-500 mr-1 shrink-0" />
          {/* All toggle */}
          <button
            type="button"
            onClick={() => {
              const allActive = activeFilterCount === 3
              setActiveFilters({
                error: !allActive,
                warning: !allActive,
                note: !allActive,
              })
            }}
            className={`px-2 py-0.5 rounded text-xs font-medium transition-all duration-150 border ${
              activeFilterCount === 3
                ? 'border-slate-500 bg-slate-700/80 text-slate-200'
                : 'border-slate-700 bg-slate-800/50 text-slate-500 hover:text-slate-300'
            }`}
          >
            All
          </button>
          {/* Severity toggles */}
          {Object.entries(SEVERITY_CONFIG).map(([key, config]) => {
            const isActive = activeFilters[key]
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleFilter(key)}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition-all duration-150 border ${
                  isActive
                    ? `${config.border} ${config.bg} ${config.badgeText}`
                    : 'border-slate-700 bg-slate-800/50 text-slate-500 hover:text-slate-300'
                }`}
              >
                {config.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Content Area */}
      <div className="max-h-80 overflow-y-auto">
        {loading ? (
          <div className="px-3 py-8 text-center">
            <Loader2
              size={20}
              className="mx-auto text-slate-500 animate-spin"
            />
            <p className="text-xs text-slate-500 mt-2">Loading events...</p>
          </div>
        ) : error ? (
          <div className="px-3 py-8 text-center">
            <AlertTriangle size={20} className="mx-auto text-yellow-500" />
            <p className="text-xs text-slate-400 mt-2">
              Failed to load expert info
            </p>
            <p className="text-xs text-slate-600 mt-1">{error}</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="px-3 py-8 text-center">
            <Info size={20} className="mx-auto text-slate-600" />
            <p className="text-xs text-slate-500 mt-2">
              {events.length === 0
                ? 'No expert info events detected'
                : 'No events match the current filters'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700/40">
            {filteredEvents.map((event, index) => {
              const config = getSeverityConfig(event.severity)
              const Icon = config.icon
              return (
                <div
                  key={`${event.packetIndex}-${index}`}
                  className={`px-3 py-2 border-l-2 ${config.border} hover:bg-slate-700/40 transition-colors duration-100 cursor-pointer`}
                  onClick={() => {
                    if (onSelectConnection && event.stream) {
                      onSelectConnection(event.stream)
                    }
                  }}
                >
                  <div className="flex items-start gap-2">
                    <Icon
                      size={12}
                      className={`${config.color} mt-0.5 shrink-0`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span
                          className={`inline-block px-1.5 py-0 rounded text-xs font-mono font-medium ${config.badgeBg} ${config.badgeText}`}
                        >
                          {event.type}
                        </span>
                        {event.packetIndex != null && (
                          <span className="text-xs text-slate-600 font-mono">
                            #{event.packetIndex}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-300 leading-snug break-all">
                        {event.message}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default ExpertInfoPanel
