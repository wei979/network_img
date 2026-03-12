import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import PacketInspector from '../components/PacketInspector'

function makeMockPacketDetail() {
  return {
    index: 0,
    timestamp: 1698076800.0,
    timestampHuman: '2023-10-23 12:00:00.000000',
    captureLength: 32,
    wireLength: 32,
    totalBytes: 32,
    rawHex: '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff',
    layers: [
      {
        name: 'Frame',
        displayName: 'Frame 0 (32 bytes on wire)',
        byteRange: [0, 31],
        fields: [
          { name: 'Frame Length', value: '32 bytes', byteRange: null },
        ]
      },
      {
        name: 'Ethernet',
        displayName: 'Ethernet II, Src: aa:bb:cc:dd:ee:ff, Dst: 00:11:22:33:44:55',
        byteRange: [0, 13],
        fields: [
          { name: 'Destination', value: '00:11:22:33:44:55', byteRange: [0, 5] },
          { name: 'Source', value: 'aa:bb:cc:dd:ee:ff', byteRange: [6, 11] },
          { name: 'Type', value: '0x0800', byteRange: [12, 13] },
        ]
      }
    ]
  }
}


describe('PacketInspector', () => {
  it('renders nothing when packetDetail is null', () => {
    const { container } = render(<PacketInspector packetDetail={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders both PacketDetailPane and HexDumpViewer', () => {
    const detail = makeMockPacketDetail()
    const { container } = render(<PacketInspector packetDetail={detail} />)

    // Should have layer tree
    expect(screen.getByText(/Frame 0/)).toBeTruthy()
    expect(screen.getByText(/Ethernet II/)).toBeTruthy()

    // Should have hex dump (offset column)
    expect(screen.getByText('00000000')).toBeTruthy()

    // Should have hex byte spans
    const byteSpans = container.querySelectorAll('[data-byte-index]')
    expect(byteSpans.length).toBe(32)
  })

  it('synchronizes highlight: hovering field highlights hex bytes', () => {
    const detail = makeMockPacketDetail()
    const { container } = render(<PacketInspector packetDetail={detail} />)

    // Hover the "Destination" field (byteRange [0, 5])
    const destField = container.querySelector('[data-field="Destination"]')
    fireEvent.mouseEnter(destField)

    // Bytes 0-5 in the hex dump should now be highlighted
    for (let i = 0; i <= 5; i++) {
      const byteSpan = container.querySelector(`[data-byte-index="${i}"]`)
      expect(byteSpan.className).toMatch(/highlight|bg-cyan/)
    }

    // Byte 6 should NOT be highlighted
    const byte6 = container.querySelector('[data-byte-index="6"]')
    expect(byte6.className).not.toMatch(/highlight|bg-cyan/)
  })

  it('synchronizes highlight: hovering hex byte highlights corresponding field', () => {
    const detail = makeMockPacketDetail()
    const { container } = render(<PacketInspector packetDetail={detail} />)

    // Hover byte index 12 (belongs to Type field [12, 13])
    const byte12 = container.querySelector('[data-byte-index="12"]')
    fireEvent.mouseEnter(byte12)

    // The Type field should be highlighted
    const typeField = container.querySelector('[data-field="Type"]')
    expect(typeField.className).toMatch(/highlight|bg-cyan/)
  })

  it('clears highlight on mouse leave', () => {
    const detail = makeMockPacketDetail()
    const { container } = render(<PacketInspector packetDetail={detail} />)

    const destField = container.querySelector('[data-field="Destination"]')
    fireEvent.mouseEnter(destField)
    fireEvent.mouseLeave(destField)

    // All bytes should no longer be highlighted
    for (let i = 0; i <= 5; i++) {
      const byteSpan = container.querySelector(`[data-byte-index="${i}"]`)
      expect(byteSpan.className).not.toMatch(/highlight|bg-cyan/)
    }
  })

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn()
    const detail = makeMockPacketDetail()
    render(<PacketInspector packetDetail={detail} onClose={onClose} />)

    const closeBtn = screen.getByLabelText('close')
    fireEvent.click(closeBtn)

    expect(onClose).toHaveBeenCalledOnce()
  })
})
