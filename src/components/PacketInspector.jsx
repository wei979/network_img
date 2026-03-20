import React, { useState, useCallback, useMemo } from 'react'
import { X } from 'lucide-react'
import { S } from '../lib/swiss-tokens'
import PacketDetailPane from './PacketDetailPane'
import HexDumpViewer from './HexDumpViewer'

/**
 * PacketInspector - Container that composes PacketDetailPane + HexDumpViewer
 *
 * Synchronizes byte-range highlighting between the layer tree (top)
 * and the hex dump (bottom). Hovering a field highlights corresponding
 * bytes in the hex dump, and hovering a byte highlights the corresponding
 * field in the layer tree.
 *
 * Props:
 *   packetDetail - Object from _extract_packet_deep_detail
 *   onClose      - Callback when close button is clicked
 */
export default function PacketInspector({ packetDetail, onClose }) {
  const [highlightByteRange, setHighlightByteRange] = useState(null)

  // When a field/layer is hovered in PacketDetailPane, highlight those bytes
  const handleFieldHover = useCallback((byteRange) => {
    setHighlightByteRange(byteRange)
  }, [])

  // Build a lookup: byteIndex -> field's byteRange for reverse highlighting
  const byteToFieldRange = useMemo(() => {
    const map = new Map()
    if (!packetDetail?.layers) return map
    for (const layer of packetDetail.layers) {
      for (const field of (layer.fields || [])) {
        if (field.byteRange) {
          for (let i = field.byteRange[0]; i <= field.byteRange[1]; i++) {
            map.set(i, field.byteRange)
          }
        }
      }
    }
    return map
  }, [packetDetail?.index, packetDetail?.rawHex])

  // When a byte is hovered in HexDumpViewer, find which field it belongs to
  const handleByteHover = useCallback((byteIndex) => {
    if (byteIndex === null) {
      setHighlightByteRange(null)
      return
    }
    const fieldRange = byteToFieldRange.get(byteIndex)
    setHighlightByteRange(fieldRange || null)
  }, [byteToFieldRange])

  if (!packetDetail) return null

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        background: S.bg,
        border: `1px solid ${S.border}`,
        borderRadius: S.radius.md,
        padding: 12,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.875rem', color: S.text.primary, fontWeight: 500 }}>
          Packet #{packetDetail.index} Detail
        </span>
        {onClose && (
          <button
            aria-label="close"
            onClick={onClose}
            style={{
              color: S.text.secondary,
              padding: 4,
              borderRadius: S.radius.sm,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = S.surface; e.currentTarget.style.color = S.text.primary }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = S.text.secondary }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Layer tree (top) */}
      <PacketDetailPane
        packetDetail={packetDetail}
        onFieldHover={handleFieldHover}
        highlightByteRange={highlightByteRange}
      />

      {/* Hex dump (bottom) */}
      <HexDumpViewer
        rawHex={packetDetail.rawHex}
        highlightByteRange={highlightByteRange}
        onByteHover={handleByteHover}
      />
    </div>
  )
}
