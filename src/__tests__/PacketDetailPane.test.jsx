import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import PacketDetailPane from '../components/PacketDetailPane'

// Mock packet detail data matching backend _extract_packet_deep_detail output
function makeMockPacketDetail() {
  return {
    index: 42,
    timestamp: 1698076800.123456,
    timestampHuman: '2023-10-23 12:00:00.123456',
    captureLength: 74,
    wireLength: 74,
    totalBytes: 74,
    rawHex: '00112233445500aabbccddee0800450000003c1c4640004006b1c6c0a80101c0a801020050c350000000010000000060022000fe300000020405b4',
    layers: [
      {
        name: 'Frame',
        displayName: 'Frame 42 (74 bytes on wire)',
        byteRange: [0, 73],
        fields: [
          { name: 'Arrival Time', value: '2023-10-23 12:00:00.123456', byteRange: null },
          { name: 'Frame Length', value: '74 bytes', byteRange: null },
          { name: 'Capture Length', value: '74 bytes', byteRange: null },
        ]
      },
      {
        name: 'Ethernet',
        displayName: 'Ethernet II, Src: 00:aa:bb:cc:dd:ee, Dst: 00:11:22:33:44:55',
        byteRange: [0, 13],
        fields: [
          { name: 'Destination', value: '00:11:22:33:44:55', byteRange: [0, 5] },
          { name: 'Source', value: '00:aa:bb:cc:dd:ee', byteRange: [6, 11] },
          { name: 'Type', value: '0x0800', byteRange: [12, 13] },
        ]
      },
      {
        name: 'IPv4',
        displayName: 'Internet Protocol Version 4, Src: 192.168.1.1, Dst: 192.168.1.2',
        byteRange: [14, 33],
        fields: [
          { name: 'Version', value: '4', byteRange: [14, 14] },
          { name: 'Header Length', value: '20 bytes (5)', byteRange: [14, 14] },
          { name: 'Total Length', value: '60', byteRange: [16, 17] },
          { name: 'TTL', value: '64', byteRange: [22, 22] },
          { name: 'Protocol', value: '6', byteRange: [23, 23] },
          { name: 'Source Address', value: '192.168.1.1', byteRange: [26, 29] },
          { name: 'Destination Address', value: '192.168.1.2', byteRange: [30, 33] },
        ]
      },
      {
        name: 'TCP',
        displayName: 'TCP, Src Port: 80, Dst Port: 50000 [SYN]',
        byteRange: [34, 53],
        fields: [
          { name: 'Source Port', value: '80', byteRange: [34, 35] },
          { name: 'Destination Port', value: '50000', byteRange: [36, 37] },
          { name: 'Sequence Number', value: '1', byteRange: [38, 41] },
          { name: 'Flags', value: '0x002 (SYN)', byteRange: [46, 47] },
          { name: 'Window', value: '8192', byteRange: [48, 49] },
        ]
      }
    ]
  }
}


describe('PacketDetailPane', () => {
  it('renders nothing when packetDetail is null', () => {
    const { container } = render(<PacketDetailPane packetDetail={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders layer tree with all layer names', () => {
    const detail = makeMockPacketDetail()
    render(<PacketDetailPane packetDetail={detail} />)

    expect(screen.getByText(/Frame 42/)).toBeTruthy()
    expect(screen.getByText(/Ethernet II/)).toBeTruthy()
    expect(screen.getByText(/Internet Protocol Version 4/)).toBeTruthy()
    expect(screen.getByText(/TCP, Src Port: 80/)).toBeTruthy()
  })

  it('collapses and expands layers on click', () => {
    const detail = makeMockPacketDetail()
    const { container } = render(<PacketDetailPane packetDetail={detail} />)

    // All layers start expanded — Ethernet fields should be visible via data-field
    const ethLayerBefore = container.querySelector('[data-layer="Ethernet"]')
    expect(ethLayerBefore.querySelectorAll('[data-field]').length).toBe(3)

    // Click Ethernet layer header to collapse
    const ethHeader = screen.getByText(/Ethernet II/)
    fireEvent.click(ethHeader)

    // After collapsing, the Ethernet layer's fields should be hidden
    const ethLayerAfter = container.querySelector('[data-layer="Ethernet"]')
    expect(ethLayerAfter.querySelectorAll('[data-field]').length).toBe(0)

    // Click again to expand
    fireEvent.click(ethHeader)
    const ethLayerExpanded = container.querySelector('[data-layer="Ethernet"]')
    expect(ethLayerExpanded.querySelectorAll('[data-field]').length).toBe(3)
  })

  it('calls onFieldHover with byteRange when hovering a field', () => {
    const onFieldHover = vi.fn()
    const detail = makeMockPacketDetail()
    const { container } = render(
      <PacketDetailPane packetDetail={detail} onFieldHover={onFieldHover} />
    )

    // Hover over a field with a byteRange using data-field attribute
    const srcAddrField = container.querySelector('[data-field="Source Address"]')
    fireEvent.mouseEnter(srcAddrField)

    expect(onFieldHover).toHaveBeenCalledWith([26, 29])
  })

  it('calls onFieldHover with null on mouse leave', () => {
    const onFieldHover = vi.fn()
    const detail = makeMockPacketDetail()
    const { container } = render(
      <PacketDetailPane packetDetail={detail} onFieldHover={onFieldHover} />
    )

    const srcAddrField = container.querySelector('[data-field="Source Address"]')
    fireEvent.mouseEnter(srcAddrField)
    fireEvent.mouseLeave(srcAddrField)

    expect(onFieldHover).toHaveBeenLastCalledWith(null)
  })

  it('calls onFieldHover with layer byteRange when hovering a layer header', () => {
    const onFieldHover = vi.fn()
    const detail = makeMockPacketDetail()
    const { container } = render(
      <PacketDetailPane packetDetail={detail} onFieldHover={onFieldHover} />
    )

    const ipLayer = container.querySelector('[data-layer="IPv4"]')
    fireEvent.mouseEnter(ipLayer)

    expect(onFieldHover).toHaveBeenCalledWith([14, 33])
  })

  it('highlights the selected field visually', () => {
    const detail = makeMockPacketDetail()
    const { container } = render(
      <PacketDetailPane
        packetDetail={detail}
        highlightByteRange={[26, 29]}
      />
    )

    const srcAddrField = container.querySelector('[data-field="Source Address"]')
    expect(srcAddrField.className).toMatch(/highlight|bg-cyan/)
  })

  it('displays field values correctly', () => {
    const detail = makeMockPacketDetail()
    render(<PacketDetailPane packetDetail={detail} />)

    expect(screen.getByText('192.168.1.1')).toBeTruthy()
    expect(screen.getByText('192.168.1.2')).toBeTruthy()
    expect(screen.getByText('0x0800')).toBeTruthy()
  })

  it('renders children collapsed by default and expands on click', () => {
    const detail = {
      ...makeMockPacketDetail(),
      layers: [{
        name: 'TCP',
        displayName: 'TCP Segment',
        byteRange: [34, 65],
        fields: [
          { name: 'Source Port', value: '80', byteRange: [34, 35] },
          {
            name: 'Options',
            value: '12 bytes (3 options)',
            byteRange: [54, 65],
            children: [
              { name: 'Maximum Segment Size', value: '1460 bytes', byteRange: [54, 57] },
              { name: 'SACK Permitted', value: '', byteRange: [58, 59] },
              { name: 'Timestamps', value: 'TSval=123, TSecr=456', byteRange: [60, 65] },
            ]
          },
        ]
      }]
    }
    const { container } = render(<PacketDetailPane packetDetail={detail} />)

    // Children should be hidden by default
    expect(container.querySelector('[data-field="Maximum Segment Size"]')).toBeNull()

    // Click the Options field to expand children
    const optionsField = container.querySelector('[data-field="Options"]')
    fireEvent.click(optionsField)

    // Children should now be visible
    expect(container.querySelector('[data-field="Maximum Segment Size"]')).toBeTruthy()
    expect(container.querySelector('[data-field="SACK Permitted"]')).toBeTruthy()
    expect(container.querySelector('[data-field="Timestamps"]')).toBeTruthy()

    // Click again to collapse
    fireEvent.click(optionsField)
    expect(container.querySelector('[data-field="Maximum Segment Size"]')).toBeNull()
  })

  it('propagates onFieldHover through child fields', () => {
    const onFieldHover = vi.fn()
    const detail = {
      ...makeMockPacketDetail(),
      layers: [{
        name: 'DNS',
        displayName: 'DNS',
        byteRange: [42, 80],
        fields: [{
          name: 'Query',
          value: 'google.com. type A',
          byteRange: [42, 60],
          children: [
            { name: 'Name', value: 'google.com.', byteRange: [44, 55] },
            { name: 'Type', value: '1 (A)', byteRange: [56, 57] },
          ]
        }]
      }]
    }
    const { container } = render(
      <PacketDetailPane packetDetail={detail} onFieldHover={onFieldHover} />
    )

    // Expand the Query field
    const queryField = container.querySelector('[data-field="Query"]')
    fireEvent.click(queryField)

    // Hover a child field
    const nameField = container.querySelector('[data-field="Name"]')
    fireEvent.mouseEnter(nameField)
    expect(onFieldHover).toHaveBeenCalledWith([44, 55])

    fireEvent.mouseLeave(nameField)
    expect(onFieldHover).toHaveBeenLastCalledWith(null)
  })

  it('supports multi-level nested children', () => {
    const detail = {
      ...makeMockPacketDetail(),
      layers: [{
        name: 'DNS',
        displayName: 'DNS',
        byteRange: [42, 120],
        fields: [{
          name: 'Answers',
          value: '2 records',
          byteRange: null,
          children: [{
            name: 'Answer 1',
            value: 'google.com. A 142.250.80.46',
            byteRange: null,
            children: [
              { name: 'Name', value: 'google.com.', byteRange: null },
              { name: 'TTL', value: '300', byteRange: null },
              { name: 'Data', value: '142.250.80.46', byteRange: null },
            ]
          }]
        }]
      }]
    }
    const { container } = render(<PacketDetailPane packetDetail={detail} />)

    // Level 1 children hidden
    expect(container.querySelector('[data-field="Answer 1"]')).toBeNull()

    // Expand Answers
    fireEvent.click(container.querySelector('[data-field="Answers"]'))
    expect(container.querySelector('[data-field="Answer 1"]')).toBeTruthy()

    // Level 2 children still hidden
    expect(container.querySelector('[data-field="TTL"]')).toBeNull()

    // Expand Answer 1
    fireEvent.click(container.querySelector('[data-field="Answer 1"]'))
    expect(container.querySelector('[data-field="Name"]')).toBeTruthy()
    expect(container.querySelector('[data-field="TTL"]')).toBeTruthy()
    expect(container.querySelector('[data-field="Data"]')).toBeTruthy()
  })
})
