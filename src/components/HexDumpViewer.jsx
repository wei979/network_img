import React, { useMemo } from 'react'

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
    <div className="bg-slate-950 border border-slate-700 rounded font-mono text-xs overflow-x-auto overflow-y-auto max-h-[300px]">
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
            className="flex items-center whitespace-nowrap px-2 py-px hover:bg-slate-800/50"
          >
            {/* Offset column */}
            <span className="text-slate-500 w-[72px] flex-shrink-0 select-none">
              {offsetHex}
            </span>

            {/* Hex bytes */}
            <span className="flex-shrink-0 mr-2">
              {row.bytes.map((b, i) => {
                const isHighlighted = highlightByteRange &&
                  b.index >= highlightByteRange[0] &&
                  b.index <= highlightByteRange[1]

                return (
                  <span
                    key={b.index}
                    data-byte-index={b.index}
                    className={`inline-block w-[22px] text-center cursor-default ${
                      isHighlighted ? 'highlight bg-cyan-800/70 text-cyan-200' : 'text-slate-300'
                    }${i === 7 ? ' mr-1' : ''}`}
                    onMouseEnter={() => onByteHover && onByteHover(b.index)}
                    onMouseLeave={() => onByteHover && onByteHover(null)}
                  >
                    {b.hex}
                  </span>
                )
              })}
              {/* Pad remaining spaces for partial rows */}
              {row.bytes.length < BYTES_PER_ROW && (
                <span className="inline-block" style={{ width: `${(BYTES_PER_ROW - row.bytes.length) * 22}px` }} />
              )}
            </span>

            {/* ASCII column */}
            <span
              data-ascii-row={row.offset}
              className="text-slate-400 flex-shrink-0 border-l border-slate-700 pl-2"
            >
              {asciiStr}
            </span>
          </div>
        )
      })}
    </div>
  )
}
