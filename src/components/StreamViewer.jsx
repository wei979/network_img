import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { X, FileText, Binary, Download, Loader2, ArrowRight, ArrowLeft } from 'lucide-react'

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/95 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col bg-slate-900 border border-slate-700 rounded-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <div>
            <h2 className="text-lg font-semibold text-slate-200">TCP Stream Viewer</h2>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              {connectionId || 'No connection selected'}
              {streamData && (
                <span className="ml-3 text-slate-500">
                  {streamData.totalSegments} segment{streamData.totalSegments !== 1 ? 's' : ''}
                </span>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            aria-label="close"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-1 px-6 pt-3 pb-0">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-t-lg transition-colors ${
                activeTab === key
                  ? 'bg-slate-800 text-slate-200 border border-slate-700 border-b-slate-800'
                  : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0" style={{ maxHeight: 'calc(90vh - 160px)' }}>
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
    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
      <Loader2 className="w-8 h-8 animate-spin mb-3" />
      <span className="text-sm">Loading stream data...</span>
    </div>
  )
}

function ErrorState({ message }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="text-red-400 text-sm font-medium mb-1">Failed to load stream</div>
      <div className="text-slate-500 text-xs font-mono">{message}</div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-500">
      <FileText className="w-8 h-8 mb-3" />
      <span className="text-sm">No stream data available</span>
    </div>
  )
}

/* ---------- ASCII Tab ---------- */

function AsciiTab({ segments }) {
  if (!segments || segments.length === 0) {
    return (
      <div className="text-sm text-slate-500 py-8 text-center">No segments in this stream</div>
    )
  }

  return (
    <div className="space-y-2">
      {segments.map((seg, idx) => {
        const isClient = seg.direction === 'client'
        return (
          <div key={idx} className="rounded border border-slate-700 bg-slate-950">
            {/* Segment header */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/60 border-b border-slate-700 text-xs">
              {isClient ? (
                <ArrowRight className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
              ) : (
                <ArrowLeft className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
              )}
              <span className={isClient ? 'text-blue-400 font-semibold' : 'text-green-400 font-semibold'}>
                {isClient ? 'Client' : 'Server'}
              </span>
              <span className="text-slate-500">
                Packet #{seg.packetIndex}
              </span>
              <span className="text-slate-500 ml-auto">
                {seg.length} bytes
              </span>
              {seg.timestamp != null && (
                <span className="text-slate-600 font-mono">
                  {seg.timestamp.toFixed(3)}
                </span>
              )}
            </div>

            {/* ASCII content */}
            <pre
              className={`px-3 py-2 text-xs leading-relaxed font-mono whitespace-pre-wrap break-all overflow-x-auto ${
                isClient ? 'text-blue-400' : 'text-green-400'
              }`}
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
    <div className="space-y-6">
      <HexSection label="Client" data={clientData} colorClass="text-blue-400" />
      <HexSection label="Server" data={serverData} colorClass="text-green-400" />
    </div>
  )
}

function HexSection({ label, data, colorClass }) {
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
        <div className={`text-sm font-semibold mb-2 ${colorClass}`}>
          {label} ({data?.length ?? 0} bytes)
        </div>
        <div className="text-xs text-slate-500">No data</div>
      </div>
    )
  }

  return (
    <div>
      <div className={`text-sm font-semibold mb-2 ${colorClass}`}>
        {label} ({data.length} bytes)
      </div>
      <div className="bg-slate-950 border border-slate-700 rounded font-mono text-xs overflow-x-auto max-h-[300px] overflow-y-auto">
        {rows.map((row) => {
          const offsetHex = row.offset.toString(16).padStart(8, '0')
          const asciiStr = row.bytes
            .map((b) => (b.value >= 32 && b.value < 127 ? String.fromCharCode(b.value) : '.'))
            .join('')

          return (
            <div
              key={row.offset}
              className="flex items-center whitespace-nowrap px-2 py-px hover:bg-slate-800/50"
            >
              {/* Offset */}
              <span className="text-slate-500 w-[72px] flex-shrink-0 select-none">
                {offsetHex}
              </span>

              {/* Hex bytes */}
              <span className="flex-shrink-0 mr-2">
                {row.bytes.map((b, i) => (
                  <span
                    key={b.index}
                    className={`inline-block w-[22px] text-center ${colorClass}${i === 7 ? ' mr-1' : ''}`}
                  >
                    {b.hex}
                  </span>
                ))}
                {row.bytes.length < BYTES_PER_ROW && (
                  <span
                    className="inline-block"
                    style={{ width: `${(BYTES_PER_ROW - row.bytes.length) * 22}px` }}
                  />
                )}
              </span>

              {/* ASCII */}
              <span className="text-slate-400 flex-shrink-0 border-l border-slate-700 pl-2">
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
    <div className="space-y-4 py-4">
      <p className="text-sm text-slate-400 mb-4">
        Download raw binary data for this stream.
      </p>

      <div className="flex flex-col gap-3">
        <button
          onClick={() => onDownload(clientData?.hex, `${baseName}_client.bin`)}
          disabled={!clientData?.hex}
          className="flex items-center gap-3 px-4 py-3 rounded-lg border border-slate-700 bg-slate-800/60 hover:bg-slate-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Download className="w-5 h-5 text-blue-400" />
          <div className="text-left">
            <div className="text-sm text-slate-200">Client Data</div>
            <div className="text-xs text-slate-500">
              {clientData?.length ?? 0} bytes
            </div>
          </div>
        </button>

        <button
          onClick={() => onDownload(serverData?.hex, `${baseName}_server.bin`)}
          disabled={!serverData?.hex}
          className="flex items-center gap-3 px-4 py-3 rounded-lg border border-slate-700 bg-slate-800/60 hover:bg-slate-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Download className="w-5 h-5 text-green-400" />
          <div className="text-left">
            <div className="text-sm text-slate-200">Server Data</div>
            <div className="text-xs text-slate-500">
              {serverData?.length ?? 0} bytes
            </div>
          </div>
        </button>
      </div>
    </div>
  )
}
