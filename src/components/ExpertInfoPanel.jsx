import React, { useState, useEffect } from 'react'
import { AlertTriangle, AlertCircle, Info, Loader2, Filter } from 'lucide-react'
import { S } from '../lib/swiss-tokens'

const SEVERITY_CONFIG = {
  error: {
    icon: AlertCircle,
    color: S.protocol.ICMP,
    border: S.protocol.ICMP,
    bg: `${S.protocol.ICMP}18`,
    badgeBg: `${S.protocol.ICMP}28`,
    badgeText: S.protocol.ICMP,
    label: 'Error',
  },
  warning: {
    icon: AlertTriangle,
    color: '#eab308',
    border: '#eab308',
    bg: '#eab30818',
    badgeBg: '#eab30828',
    badgeText: '#fbbf24',
    label: 'Warning',
  },
  note: {
    icon: Info,
    color: S.protocol.UDP,
    border: S.protocol.UDP,
    bg: `${S.protocol.UDP}18`,
    badgeBg: `${S.protocol.UDP}28`,
    badgeText: S.protocol.UDP,
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
    <div style={{
      background: S.surface,
      borderRadius: S.radius.md,
      border: `1px solid ${S.border}`,
      overflow: 'hidden',
      fontFamily: S.font.sans,
    }}>
      {/* Header */}
      <div style={{ padding: '10px 12px', borderBottom: `1px solid ${S.border}`, background: S.surface }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={14} style={{ color: S.text.secondary }} />
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: S.text.primary }}>
              Expert Info
            </span>
          </div>
          {summary && (
            <span style={{ fontSize: '0.75rem', color: S.text.tertiary }}>
              {summary.total} events
            </span>
          )}
        </div>
      </div>

      {/* Summary Bar */}
      {summary && !loading && !error && (
        <div style={{ padding: '8px 12px', borderBottom: `1px solid ${S.border}`, background: S.bgRaised }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {[
              { key: 'errors', severity: 'error' },
              { key: 'warnings', severity: 'warning' },
              { key: 'notes', severity: 'note' },
            ].map(({ key, severity }) => {
              const config = getSeverityConfig(severity)
              const Icon = config.icon
              const count = summary[key] || 0
              return (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Icon size={11} style={{ color: config.color }} />
                  <span style={{ fontSize: '0.75rem', fontFamily: S.font.mono, color: config.color }}>
                    {count}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Filter Buttons */}
      <div style={{ padding: '8px 12px', borderBottom: `1px solid ${S.border}`, background: S.bgRaised }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Filter size={11} style={{ color: S.text.tertiary, marginRight: 4, flexShrink: 0 }} />
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
            style={{
              padding: '2px 8px', borderRadius: S.radius.sm, fontSize: '0.75rem', fontWeight: 500,
              border: `1px solid ${activeFilterCount === 3 ? S.borderStrong : S.border}`,
              background: activeFilterCount === 3 ? S.surfaceHover : 'transparent',
              color: activeFilterCount === 3 ? S.text.primary : S.text.tertiary,
              cursor: 'pointer',
            }}
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
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '2px 8px', borderRadius: S.radius.sm,
                  fontSize: '0.75rem', fontWeight: 500,
                  border: `1px solid ${isActive ? config.border : S.border}`,
                  background: isActive ? config.bg : 'transparent',
                  color: isActive ? config.badgeText : S.text.tertiary,
                  cursor: 'pointer',
                }}
              >
                {config.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Content Area */}
      <div style={{ maxHeight: 320, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ padding: '32px 12px', textAlign: 'center' }}>
            <Loader2
              size={20}
              style={{ color: S.text.tertiary, margin: '0 auto', display: 'block', animation: 'spin 1s linear infinite' }}
            />
            <p style={{ fontSize: '0.75rem', color: S.text.tertiary, marginTop: 8 }}>Loading events...</p>
          </div>
        ) : error ? (
          <div style={{ padding: '32px 12px', textAlign: 'center' }}>
            <AlertTriangle size={20} style={{ color: '#eab308', margin: '0 auto', display: 'block' }} />
            <p style={{ fontSize: '0.75rem', color: S.text.secondary, marginTop: 8 }}>
              Failed to load expert info
            </p>
            <p style={{ fontSize: '0.75rem', color: S.text.faint, marginTop: 4 }}>{error}</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div style={{ padding: '32px 12px', textAlign: 'center' }}>
            <Info size={20} style={{ color: S.text.faint, margin: '0 auto', display: 'block' }} />
            <p style={{ fontSize: '0.75rem', color: S.text.tertiary, marginTop: 8 }}>
              {events.length === 0
                ? 'No expert info events detected'
                : 'No events match the current filters'}
            </p>
          </div>
        ) : (
          <div>
            {filteredEvents.map((event, index) => {
              const config = getSeverityConfig(event.severity)
              const Icon = config.icon
              return (
                <div
                  key={`${event.packetIndex}-${index}`}
                  style={{
                    padding: '8px 12px',
                    borderLeft: `2px solid ${config.border}`,
                    borderBottom: `1px solid ${S.border}30`,
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    if (onSelectConnection && event.stream) {
                      onSelectConnection(event.stream)
                    }
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = S.surfaceHover}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <Icon
                      size={12}
                      style={{ color: config.color, marginTop: 2, flexShrink: 0 }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <span
                          style={{
                            display: 'inline-block', padding: '0 6px',
                            borderRadius: S.radius.sm, fontSize: '0.75rem',
                            fontFamily: S.font.mono, fontWeight: 500,
                            background: config.badgeBg, color: config.badgeText,
                          }}
                        >
                          {event.type}
                        </span>
                        {event.packetIndex != null && (
                          <span style={{ fontSize: '0.75rem', color: S.text.faint, fontFamily: S.font.mono }}>
                            #{event.packetIndex}
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: '0.75rem', color: S.text.primary, lineHeight: 1.5, wordBreak: 'break-all', margin: 0 }}>
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
