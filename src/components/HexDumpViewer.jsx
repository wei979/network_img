import React, { useMemo } from 'react'
import { S } from '../lib/swiss-tokens'

/**
 * HexDumpViewer - Wireshark-style hex dump display
 *
 * Shows raw packet bytes in the classic hex dump format:
 *   OFFSET   00 01 02 03 04 05 06 07  08 09 0A 0B 0C 0D 0E 0F  |ASCII...........|
 *
 * Props:
 *   rawHex             - Hex string of raw packet bytes (from _extract_packet_deep_detail)
 *   highlightByteRange - [start, end] inclusive byte range to highlight
 *   onByteHover        - Callback(byteIndex | null) when user hovers a byte
 */
const HEX_RE = /^[0-9a-fA-F]*$/
const BYTES_PER_ROW = 16

export default function HexDumpViewer({ rawHex, highlightByteRange, onByteHover }) {
  const rows = useMemo(() => {
    if (!rawHex || rawHex.length % 2 !== 0 || !HEX_RE.test(rawHex)) return null
    const totalBytes = rawHex.length / 2
    const result = []

    for (let offset = 0; offset < totalBytes; offset += BYTES_PER_ROW) {
      const rowBytes = []
      for (let i = 0; i < BYTES_PER_ROW && offset + i < totalBytes; i++) {
        const byteIndex = offset + i
        const hexStr = rawHex.slice(byteIndex * 2, byteIndex * 2 + 2)
        const byteVal = parseInt(hexStr, 16)
        rowBytes.push({ index: byteIndex, hex: hexStr, value: byteVal })
      }
      result.push({ offset, bytes: rowBytes })
    }
    return result
  }, [rawHex])

  if (!rows) return null

  return (
    <div
      style={{
        background: S.bg,
        border: `1px solid ${S.border}`,
        borderRadius: S.radius.sm,
        fontFamily: S.font.mono,
        fontSize: '0.75rem',
        overflowX: 'auto',
        overflowY: 'auto',
        maxHeight: '300px',
      }}
    >
      {rows.map((row) => {
        const offsetHex = row.offset.toString(16).padStart(8, '0')

        // Build ASCII string
        const asciiStr = row.bytes.map(b =>
          b.value >= 32 && b.value < 127 ? String.fromCharCode(b.value) : '.'
        ).join('')

        return (
          <div
            key={row.offset}
            data-hex-row={row.offset}
            style={{
              display: 'flex',
              alignItems: 'center',
              whiteSpace: 'nowrap',
              padding: '1px 8px',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = S.surfaceHover}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            {/* Offset column */}
            <span style={{ color: S.text.tertiary, width: 72, flexShrink: 0, userSelect: 'none' }}>
              {offsetHex}
            </span>

            {/* Hex bytes */}
            <span style={{ flexShrink: 0, marginRight: 8 }}>
              {row.bytes.map((b, i) => {
                const isHighlighted = highlightByteRange &&
                  b.index >= highlightByteRange[0] &&
                  b.index <= highlightByteRange[1]

                return (
                  <span
                    key={b.index}
                    data-byte-index={b.index}
                    style={{
                      display: 'inline-block',
                      width: 22,
                      textAlign: 'center',
                      cursor: 'default',
                      background: isHighlighted ? `${S.accent}aa` : 'transparent',
                      color: isHighlighted ? S.text.primary : S.text.primary,
                      marginRight: i === 7 ? 4 : 0,
                    }}
                    onMouseEnter={() => onByteHover && onByteHover(b.index)}
                    onMouseLeave={() => onByteHover && onByteHover(null)}
                  >
                    {b.hex}
                  </span>
                )
              })}
              {/* Pad remaining spaces for partial rows */}
              {row.bytes.length < BYTES_PER_ROW && (
                <span style={{ display: 'inline-block', width: (BYTES_PER_ROW - row.bytes.length) * 22 }} />
              )}
            </span>

            {/* ASCII column */}
            <span
              data-ascii-row={row.offset}
              style={{
                color: S.text.secondary,
                flexShrink: 0,
                borderLeft: `1px solid ${S.border}`,
                paddingLeft: 8,
              }}
            >
              {asciiStr}
            </span>
          </div>
        )
      })}
    </div>
  )
}
