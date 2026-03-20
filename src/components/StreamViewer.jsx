import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { X, FileText, Binary, Download, Loader2, ArrowRight, ArrowLeft } from 'lucide-react'
import { S } from '../lib/swiss-tokens'

const BYTES_PER_ROW = 16

/**
 * StreamViewer - TCP stream viewer (Follow TCP Stream)
 *
 * Displays reassembled TCP stream data in ASCII, Hex, and Raw (download) views.
 * Similar to Wireshark's "Follow TCP Stream" feature.
 *
 * Props:
 *   connectionId - string, the connection identifier (e.g. "tcp-10.0.0.1-80-10.0.0.2-443")
 *   visible      - boolean, controls overlay visibility
 *   onClose      - callback invoked when the panel is closed
 */
export default function StreamViewer({ connectionId, visible, onClose }) {
  const [streamData, setStreamData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('ascii')

  useEffect(() => {
    if (!connectionId || !visible) return

    let cancelled = false
    setLoading(true)
    setError(null)
    setStreamData(null)

    fetch(`/api/stream/${encodeURIComponent(connectionId)}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
        return res.json()
      })
      .then((data) => {
        if (!cancelled) setStreamData(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [connectionId, visible])

  const handleDownload = useCallback((hex, filename) => {
    if (!hex) return
    const bytes = new Uint8Array(hex.length / 2)
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16)
    }
    const blob = new Blob([bytes], { type: 'application/octet-stream' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [])

  if (!visible) return null

  const tabs = [
    { key: 'ascii', label: 'ASCII', icon: FileText },
    { key: 'hex', label: 'Hex', icon: Binary },
    { key: 'raw', label: 'Raw', icon: Download },
  ]

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${S.bg}f0` }}>
      <div style={{
        position: 'relative', width: '100%', maxWidth: '56rem', margin: '0 1rem',
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        background: S.bg, border: `1px solid ${S.border}`, borderRadius: S.radius.md,
        fontFamily: S.font.sans,
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: `1px solid ${S.border}` }}>
          <div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: S.text.primary, margin: 0 }}>TCP Stream Viewer</h2>
            <p style={{ fontSize: '0.75rem', color: S.text.secondary, fontFamily: S.font.mono, marginTop: 2 }}>
              {connectionId || 'No connection selected'}
              {streamData && (
                <span style={{ marginLeft: 12, color: S.text.tertiary }}>
                  {streamData.totalSegments} segment{streamData.totalSegments !== 1 ? 's' : ''}
                </span>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ padding: 8, background: 'transparent', border: 'none', borderRadius: S.radius.sm, cursor: 'pointer', color: S.text.secondary }}
            aria-label="close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab bar — underline style */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '12px 24px 0' }}>
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 12px',
                fontSize: '0.875rem',
                background: 'transparent', border: 'none',
                borderBottom: activeTab === key ? `2px solid ${S.accent}` : '2px solid transparent',
                color: activeTab === key ? S.text.primary : S.text.secondary,
                cursor: 'pointer',
              }}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Content area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px', minHeight: 0, maxHeight: 'calc(90vh - 160px)' }}>
          {loading && <LoadingState />}
          {error && <ErrorState message={error} />}
          {!loading && !error && !streamData && <EmptyState />}
          {!loading && !error && streamData && (
            <>
              {activeTab === 'ascii' && (
                <AsciiTab segments={streamData.segments} />
              )}
              {activeTab === 'hex' && (
                <HexTab
                  clientData={streamData.clientData}
                  serverData={streamData.serverData}
                />
              )}
              {activeTab === 'raw' && (
                <RawTab
                  connectionId={streamData.connectionId}
                  clientData={streamData.clientData}
                  serverData={streamData.serverData}
                  onDownload={handleDownload}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/* ---------- State placeholders ---------- */

function LoadingState() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 0', color: S.text.secondary }}>
      <Loader2 className="w-8 h-8 animate-spin" style={{ marginBottom: 12 }} />
      <span style={{ fontSize: '0.875rem' }}>Loading stream data...</span>
    </div>
  )
}

function ErrorState({ message }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 0' }}>
      <div style={{ color: S.protocol.ICMP, fontSize: '0.875rem', fontWeight: 500, marginBottom: 4 }}>Failed to load stream</div>
      <div style={{ color: S.text.tertiary, fontSize: '0.75rem', fontFamily: S.font.mono }}>{message}</div>
    </div>
  )
}

function EmptyState() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 0', color: S.text.tertiary }}>
      <FileText className="w-8 h-8" style={{ marginBottom: 12 }} />
      <span style={{ fontSize: '0.875rem' }}>No stream data available</span>
    </div>
  )
}

/* ---------- ASCII Tab ---------- */

function AsciiTab({ segments }) {
  if (!segments || segments.length === 0) {
    return (
      <div style={{ fontSize: '0.875rem', color: S.text.tertiary, padding: '32px 0', textAlign: 'center' }}>No segments in this stream</div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {segments.map((seg, idx) => {
        const isClient = seg.direction === 'client'
        const dirColor = isClient ? S.protocol.UDP : S.protocol.HTTP
        return (
          <div key={idx} style={{ borderRadius: S.radius.sm, border: `1px solid ${S.border}`, background: S.bg }}>
            {/* Segment header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 12px', background: S.surface,
              borderBottom: `1px solid ${S.border}`, fontSize: '0.75rem',
            }}>
              {isClient ? (
                <ArrowRight className="w-3.5 h-3.5" style={{ color: dirColor, flexShrink: 0 }} />
              ) : (
                <ArrowLeft className="w-3.5 h-3.5" style={{ color: dirColor, flexShrink: 0 }} />
              )}
              <span style={{ color: dirColor, fontWeight: 600 }}>
                {isClient ? 'Client' : 'Server'}
              </span>
              <span style={{ color: S.text.tertiary }}>
                Packet #{seg.packetIndex}
              </span>
              <span style={{ color: S.text.tertiary, marginLeft: 'auto' }}>
                {seg.length} bytes
              </span>
              {seg.timestamp != null && (
                <span style={{ color: S.text.faint, fontFamily: S.font.mono }}>
                  {seg.timestamp.toFixed(3)}
                </span>
              )}
            </div>

            {/* ASCII content */}
            <pre
              style={{
                padding: '8px 12px', fontSize: '0.75rem', lineHeight: 1.6,
                fontFamily: S.font.mono, whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                overflowX: 'auto', color: dirColor, margin: 0,
              }}
            >
              {seg.ascii || '(empty)'}
            </pre>
          </div>
        )
      })}
    </div>
  )
}

/* ---------- Hex Tab ---------- */

function HexTab({ clientData, serverData }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <HexSection label="Client" data={clientData} color={S.protocol.UDP} />
      <HexSection label="Server" data={serverData} color={S.protocol.HTTP} />
    </div>
  )
}

function HexSection({ label, data, color }) {
  const rows = useMemo(() => {
    if (!data?.hex) return null
    const hex = data.hex
    const totalBytes = hex.length / 2
    const result = []

    for (let offset = 0; offset < totalBytes; offset += BYTES_PER_ROW) {
      const rowBytes = []
      for (let i = 0; i < BYTES_PER_ROW && offset + i < totalBytes; i++) {
        const byteIndex = offset + i
        const hexStr = hex.slice(byteIndex * 2, byteIndex * 2 + 2)
        const byteVal = parseInt(hexStr, 16)
        rowBytes.push({ index: byteIndex, hex: hexStr, value: byteVal })
      }
      result.push({ offset, bytes: rowBytes })
    }
    return result
  }, [data?.hex])

  if (!rows || rows.length === 0) {
    return (
      <div>
        <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: 8, color }}>
          {label} ({data?.length ?? 0} bytes)
        </div>
        <div style={{ fontSize: '0.75rem', color: S.text.tertiary }}>No data</div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: 8, color }}>
        {label} ({data.length} bytes)
      </div>
      <div style={{
        background: S.bg, border: `1px solid ${S.border}`, borderRadius: S.radius.sm,
        fontFamily: S.font.mono, fontSize: '0.75rem',
        overflowX: 'auto', maxHeight: 300, overflowY: 'auto',
      }}>
        {rows.map((row) => {
          const offsetHex = row.offset.toString(16).padStart(8, '0')
          const asciiStr = row.bytes
            .map((b) => (b.value >= 32 && b.value < 127 ? String.fromCharCode(b.value) : '.'))
            .join('')

          return (
            <div
              key={row.offset}
              style={{
                display: 'flex', alignItems: 'center', whiteSpace: 'nowrap',
                padding: '1px 8px',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = S.surfaceHover}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              {/* Offset */}
              <span style={{ color: S.text.tertiary, width: 72, flexShrink: 0, userSelect: 'none' }}>
                {offsetHex}
              </span>

              {/* Hex bytes */}
              <span style={{ flexShrink: 0, marginRight: 8 }}>
                {row.bytes.map((b, i) => (
                  <span
                    key={b.index}
                    style={{
                      display: 'inline-block', width: 22, textAlign: 'center',
                      color, marginRight: i === 7 ? 4 : 0,
                    }}
                  >
                    {b.hex}
                  </span>
                ))}
                {row.bytes.length < BYTES_PER_ROW && (
                  <span
                    style={{ display: 'inline-block', width: `${(BYTES_PER_ROW - row.bytes.length) * 22}px` }}
                  />
                )}
              </span>

              {/* ASCII */}
              <span style={{ color: S.text.secondary, flexShrink: 0, borderLeft: `1px solid ${S.border}`, paddingLeft: 8 }}>
                {asciiStr}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ---------- Raw Tab ---------- */

function RawTab({ connectionId, clientData, serverData, onDownload }) {
  const baseName = connectionId ? connectionId.replace(/[^a-zA-Z0-9._-]/g, '_') : 'stream'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '16px 0' }}>
      <p style={{ fontSize: '0.875rem', color: S.text.secondary, marginBottom: 16 }}>
        Download raw binary data for this stream.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button
          onClick={() => onDownload(clientData?.hex, `${baseName}_client.bin`)}
          disabled={!clientData?.hex}
          style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 16px', borderRadius: S.radius.sm,
            border: `1px solid ${S.border}`, background: S.surface,
            cursor: clientData?.hex ? 'pointer' : 'not-allowed',
            opacity: clientData?.hex ? 1 : 0.3,
          }}
        >
          <Download className="w-5 h-5" style={{ color: S.protocol.UDP }} />
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '0.875rem', color: S.text.primary }}>Client Data</div>
            <div style={{ fontSize: '0.75rem', color: S.text.tertiary }}>
              {clientData?.length ?? 0} bytes
            </div>
          </div>
        </button>

        <button
          onClick={() => onDownload(serverData?.hex, `${baseName}_server.bin`)}
          disabled={!serverData?.hex}
          style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 16px', borderRadius: S.radius.sm,
            border: `1px solid ${S.border}`, background: S.surface,
            cursor: serverData?.hex ? 'pointer' : 'not-allowed',
            opacity: serverData?.hex ? 1 : 0.3,
          }}
        >
          <Download className="w-5 h-5" style={{ color: S.protocol.HTTP }} />
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '0.875rem', color: S.text.primary }}>Server Data</div>
            <div style={{ fontSize: '0.75rem', color: S.text.tertiary }}>
              {serverData?.length ?? 0} bytes
            </div>
          </div>
        </button>
      </div>
    </div>
  )
}
