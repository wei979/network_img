import React, { useState } from 'react'
import { ChevronRight, ChevronDown } from 'lucide-react'
import { S } from '../lib/swiss-tokens'

/**
 * PacketDetailPane - Wireshark-style collapsible layer tree
 *
 * Displays the dissected layers of a single packet (Frame -> Ethernet -> IPv4 -> TCP/UDP/ICMP -> Data)
 * with collapsible sections and per-field byte range highlighting.
 *
 * Props:
 *   packetDetail   - Object from _extract_packet_deep_detail (layers, rawHex, etc.)
 *   onFieldHover   - Callback(byteRange | null) when user hovers a field/layer
 *   highlightByteRange - [start, end] byte range to visually highlight (from HexDumpViewer)
 */
export default function PacketDetailPane({ packetDetail, onFieldHover, highlightByteRange }) {
  if (!packetDetail) return null

  const { layers = [] } = packetDetail

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        fontSize: '0.75rem',
        fontFamily: S.font.mono,
        background: S.bg,
        border: `1px solid ${S.border}`,
        borderRadius: S.radius.sm,
        overflowY: 'auto',
        maxHeight: 400,
      }}
    >
      {layers.map((layer, idx) => (
        <LayerNode
          key={`${layer.name}-${idx}`}
          layer={layer}
          onFieldHover={onFieldHover}
          highlightByteRange={highlightByteRange}
        />
      ))}
    </div>
  )
}

function LayerNode({ layer, onFieldHover, highlightByteRange }) {
  const [expanded, setExpanded] = useState(true)

  const isLayerHighlighted = highlightByteRange &&
    layer.byteRange &&
    highlightByteRange[0] === layer.byteRange[0] &&
    highlightByteRange[1] === layer.byteRange[1]

  const handleLayerMouseEnter = () => {
    if (onFieldHover && layer.byteRange) {
      onFieldHover(layer.byteRange)
    }
  }

  const handleLayerMouseLeave = () => {
    if (onFieldHover) {
      onFieldHover(null)
    }
  }

  return (
    <div
      data-layer={layer.name}
      onMouseEnter={handleLayerMouseEnter}
      onMouseLeave={handleLayerMouseLeave}
    >
      {/* Layer header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '2px 8px',
          cursor: 'pointer',
          userSelect: 'none',
          background: isLayerHighlighted ? `${S.accent}40` : 'transparent',
        }}
        onClick={() => setExpanded(!expanded)}
        onMouseEnter={(e) => e.currentTarget.style.background = isLayerHighlighted ? `${S.accent}60` : S.surfaceHover}
        onMouseLeave={(e) => e.currentTarget.style.background = isLayerHighlighted ? `${S.accent}40` : 'transparent'}
      >
        {expanded
          ? <ChevronDown size={12} style={{ color: S.text.secondary, flexShrink: 0 }} />
          : <ChevronRight size={12} style={{ color: S.text.secondary, flexShrink: 0 }} />
        }
        <span style={{ color: S.text.primary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{layer.displayName}</span>
      </div>

      {/* Fields */}
      {expanded && (
        <div style={{ paddingLeft: 20 }}>
          {(layer.fields ?? []).map((field, fidx) => (
            <FieldRow
              key={`${field.name}-${fidx}`}
              field={field}
              depth={0}
              onFieldHover={onFieldHover}
              highlightByteRange={highlightByteRange}
            />
          ))}
        </div>
      )}
    </div>
  )
}

const MAX_FIELD_DEPTH = 8

function FieldRow({ field, depth = 0, onFieldHover, highlightByteRange }) {
  const hasChildren = depth < MAX_FIELD_DEPTH && field.children?.length > 0
  const [childExpanded, setChildExpanded] = useState(false)

  const isHighlighted = highlightByteRange &&
    field.byteRange &&
    highlightByteRange[0] === field.byteRange[0] &&
    highlightByteRange[1] === field.byteRange[1]

  const handleMouseEnter = () => {
    if (onFieldHover && field.byteRange) {
      onFieldHover(field.byteRange)
    }
  }

  const handleMouseLeave = () => {
    if (onFieldHover) {
      onFieldHover(null)
    }
  }

  return (
    <div>
      <div
        data-field={field.name}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '1px 8px',
          cursor: hasChildren ? 'pointer' : 'default',
          background: isHighlighted ? `${S.accent}50` : 'transparent',
        }}
        onMouseEnter={(e) => {
          handleMouseEnter()
          if (!isHighlighted) e.currentTarget.style.background = `${S.surfaceHover}50`
        }}
        onMouseLeave={(e) => {
          handleMouseLeave()
          e.currentTarget.style.background = isHighlighted ? `${S.accent}50` : 'transparent'
        }}
        onClick={hasChildren ? () => setChildExpanded(!childExpanded) : undefined}
      >
        {hasChildren && (
          childExpanded
            ? <ChevronDown size={10} style={{ color: S.text.secondary, flexShrink: 0 }} />
            : <ChevronRight size={10} style={{ color: S.text.secondary, flexShrink: 0 }} />
        )}
        <span style={{ color: S.text.secondary }}>{field.name}:</span>
        <span style={{ color: S.text.primary }}>{field.value}</span>
      </div>
      {hasChildren && childExpanded && (
        <div style={{ paddingLeft: 16 }}>
          {field.children.map((child, cidx) => (
            <FieldRow
              key={`${child.name}-${cidx}`}
              field={child}
              depth={depth + 1}
              onFieldHover={onFieldHover}
              highlightByteRange={highlightByteRange}
            />
          ))}
        </div>
      )}
    </div>
  )
}
