import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import HexDumpViewer from '../components/HexDumpViewer'

// Short hex string: 32 bytes (64 hex chars) → 2 rows of 16 bytes
const MOCK_HEX = '00112233445566778899aabbccddeeff' +
                 'deadbeefcafebabe1234567890abcdef'

describe('HexDumpViewer', () => {
  it('renders nothing when rawHex is empty or missing', () => {
    const { container: c1 } = render(<HexDumpViewer rawHex="" />)
    expect(c1.firstChild).toBeNull()

    const { container: c2 } = render(<HexDumpViewer rawHex={null} />)
    expect(c2.firstChild).toBeNull()
  })

  it('renders hex dump with correct number of rows', () => {
    const { container } = render(<HexDumpViewer rawHex={MOCK_HEX} />)
    // 32 bytes → 2 rows of 16 bytes each
    const rows = container.querySelectorAll('[data-hex-row]')
    expect(rows.length).toBe(2)
  })

  it('shows offset column with hex addresses', () => {
    render(<HexDumpViewer rawHex={MOCK_HEX} />)
    // First row offset should be 00000000
    expect(screen.getByText('00000000')).toBeTruthy()
    // Second row offset should be 00000010
    expect(screen.getByText('00000010')).toBeTruthy()
  })

  it('displays all hex byte pairs', () => {
    const { container } = render(<HexDumpViewer rawHex={MOCK_HEX} />)
    // Each byte renders as a span with data-byte-index
    const byteSpans = container.querySelectorAll('[data-byte-index]')
    expect(byteSpans.length).toBe(32) // 32 bytes total
  })

  it('shows ASCII representation column', () => {
    const { container } = render(<HexDumpViewer rawHex={MOCK_HEX} />)
    // ASCII section should exist
    const asciiSections = container.querySelectorAll('[data-ascii-row]')
    expect(asciiSections.length).toBe(2) // one per row
  })

  it('replaces non-printable ASCII chars with dots', () => {
    // 0x00 is non-printable → should be '.'
    const { container } = render(<HexDumpViewer rawHex={MOCK_HEX} />)
    const firstAscii = container.querySelector('[data-ascii-row]')
    const text = firstAscii.textContent
    // 0x00 (first byte) should be a dot
    expect(text[0]).toBe('.')
  })

  it('highlights bytes within the given byteRange', () => {
    const { container } = render(
      <HexDumpViewer rawHex={MOCK_HEX} highlightByteRange={[2, 5]} />
    )

    // Bytes at index 2,3,4,5 should have highlight class
    for (let i = 2; i <= 5; i++) {
      const byteSpan = container.querySelector(`[data-byte-index="${i}"]`)
      expect(byteSpan.className).toMatch(/highlight|bg-cyan|bg-blue/)
    }

    // Byte at index 0 should NOT have highlight
    const firstByte = container.querySelector('[data-byte-index="0"]')
    expect(firstByte.className).not.toMatch(/highlight|bg-cyan|bg-blue/)
  })

  it('calls onByteHover with byte index on mouse enter', () => {
    const onByteHover = vi.fn()
    const { container } = render(
      <HexDumpViewer rawHex={MOCK_HEX} onByteHover={onByteHover} />
    )

    const byte5 = container.querySelector('[data-byte-index="5"]')
    fireEvent.mouseEnter(byte5)

    expect(onByteHover).toHaveBeenCalledWith(5)
  })

  it('calls onByteHover with null on mouse leave', () => {
    const onByteHover = vi.fn()
    const { container } = render(
      <HexDumpViewer rawHex={MOCK_HEX} onByteHover={onByteHover} />
    )

    const byte5 = container.querySelector('[data-byte-index="5"]')
    fireEvent.mouseEnter(byte5)
    fireEvent.mouseLeave(byte5)

    expect(onByteHover).toHaveBeenLastCalledWith(null)
  })

  it('handles partial last row (fewer than 16 bytes)', () => {
    // 20 bytes → row 1: 16 bytes, row 2: 4 bytes
    const shortHex = MOCK_HEX.slice(0, 40) // 20 bytes
    const { container } = render(<HexDumpViewer rawHex={shortHex} />)

    const rows = container.querySelectorAll('[data-hex-row]')
    expect(rows.length).toBe(2)

    const byteSpans = container.querySelectorAll('[data-byte-index]')
    expect(byteSpans.length).toBe(20)
  })
})
