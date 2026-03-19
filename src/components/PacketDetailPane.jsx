import React, { useState } from 'react'
import { ChevronRight, ChevronDown } from 'lucide-react'

/**
 * PacketDetailPane - Wireshark-style collapsible layer tree
 *
 * Displays the dissected layers of a single packet (Frame → Ethernet → IPv4 → TCP/UDP/ICMP → Data)
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
    <div className="flex flex-col text-xs font-mono bg-slate-900 border border-slate-700 rounded overflow-y-auto max-h-[400px]">
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
        className={`flex items-center gap-1 px-2 py-0.5 cursor-pointer select-none hover:bg-slate-700/50 ${
          isLayerHighlighted ? 'bg-cyan-900/40' : ''
        }`}
        onClick={() => setExpanded(!expanded)}
      >
        {expanded
          ? <ChevronDown size={12} className="text-slate-400 flex-shrink-0" />
          : <ChevronRight size={12} className="text-slate-400 flex-shrink-0" />
        }
        <span className="text-slate-200 truncate">{layer.displayName}</span>
      </div>

      {/* Fields */}
      {expanded && (
        <div className="pl-5">
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
        className={`flex items-center gap-2 px-2 py-px hover:bg-slate-700/30 ${
          hasChildren ? 'cursor-pointer' : 'cursor-default'
        } ${isHighlighted ? 'highlight bg-cyan-900/50' : ''}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={hasChildren ? () => setChildExpanded(!childExpanded) : undefined}
      >
        {hasChildren && (
          childExpanded
            ? <ChevronDown size={10} className="text-slate-400 flex-shrink-0" />
            : <ChevronRight size={10} className="text-slate-400 flex-shrink-0" />
        )}
        <span className="text-slate-400">{field.name}:</span>
        <span className="text-slate-200">{field.value}</span>
      </div>
      {hasChildren && childExpanded && (
        <div className="pl-4">
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
