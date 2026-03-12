import { describe, it, expect } from 'vitest'
import {
  getDepthLabel,
  computeSearchMatchedNodeIds,
  computeSearchMatchedConnectionIds
} from '../lib/nodeDashboard.js'

describe('getDepthLabel', () => {
  it('returns "中心" when isCenter is true regardless of depth', () => {
    expect(getDepthLabel(0, true)).toBe('中心')
    expect(getDepthLabel(1, true)).toBe('中心')
    expect(getDepthLabel(5, true)).toBe('中心')
  })

  it('returns "中心" when depth is 0 and isCenter is false', () => {
    expect(getDepthLabel(0, false)).toBe('中心')
  })

  it('returns "分支" when depth is 1 and not isCenter', () => {
    expect(getDepthLabel(1, false)).toBe('分支')
  })

  it('returns "葉節點" when depth is 2 and not isCenter', () => {
    expect(getDepthLabel(2, false)).toBe('葉節點')
  })

  it('returns "葉節點" when depth is 3 and not isCenter', () => {
    expect(getDepthLabel(3, false)).toBe('葉節點')
  })

  it('returns "葉節點" for any depth >= 2 when not isCenter', () => {
    expect(getDepthLabel(10, false)).toBe('葉節點')
    expect(getDepthLabel(99, false)).toBe('葉節點')
  })
})

describe('computeSearchMatchedNodeIds', () => {
  const nodes = [
    { id: '10.0.0.1', label: '10.0.0.1', depth: 0, isCenter: true },
    { id: '10.0.0.2', label: '10.0.0.2', depth: 1, isCenter: false },
    { id: '192.168.1.1', label: '192.168.1.1', depth: 1, isCenter: false },
    { id: '192.168.1.2', label: '192.168.1.2', depth: 2, isCenter: false },
    { id: '172.16.0.1', label: '172.16.0.1', depth: 1, isCenter: false },
  ]

  it('returns null when query is empty string', () => {
    expect(computeSearchMatchedNodeIds(nodes, '')).toBeNull()
  })

  it('returns null when query is only whitespace', () => {
    expect(computeSearchMatchedNodeIds(nodes, '   ')).toBeNull()
  })

  it('returns null when query is null', () => {
    expect(computeSearchMatchedNodeIds(nodes, null)).toBeNull()
  })

  it('returns null when query is undefined', () => {
    expect(computeSearchMatchedNodeIds(nodes, undefined)).toBeNull()
  })

  it('matches nodes whose id contains the query substring', () => {
    const result = computeSearchMatchedNodeIds(nodes, '10.0')
    expect(result).toBeInstanceOf(Set)
    expect(result.has('10.0.0.1')).toBe(true)
    expect(result.has('10.0.0.2')).toBe(true)
    expect(result.has('192.168.1.1')).toBe(false)
    expect(result.has('172.16.0.1')).toBe(false)
  })

  it('is case-insensitive', () => {
    const nodesWithMixedCase = [
      { id: 'Server-A', label: 'Server-A' },
      { id: 'server-b', label: 'server-b' },
      { id: 'CLIENT-X', label: 'CLIENT-X' },
    ]
    const result = computeSearchMatchedNodeIds(nodesWithMixedCase, 'server')
    expect(result.has('Server-A')).toBe(true)
    expect(result.has('server-b')).toBe(true)
    expect(result.has('CLIENT-X')).toBe(false)
  })

  it('returns an empty Set when no nodes match', () => {
    const result = computeSearchMatchedNodeIds(nodes, '999.999')
    expect(result).toBeInstanceOf(Set)
    expect(result.size).toBe(0)
  })

  it('handles an empty nodes array', () => {
    const result = computeSearchMatchedNodeIds([], '10.0')
    expect(result).toBeInstanceOf(Set)
    expect(result.size).toBe(0)
  })

  it('trims leading/trailing whitespace from the query', () => {
    const result = computeSearchMatchedNodeIds(nodes, '  192.168  ')
    expect(result).toBeInstanceOf(Set)
    expect(result.has('192.168.1.1')).toBe(true)
    expect(result.has('192.168.1.2')).toBe(true)
    expect(result.has('10.0.0.1')).toBe(false)
  })

  it('matches the full id when query equals the entire id', () => {
    const result = computeSearchMatchedNodeIds(nodes, '172.16.0.1')
    expect(result).toBeInstanceOf(Set)
    expect(result.has('172.16.0.1')).toBe(true)
    expect(result.size).toBe(1)
  })
})

describe('computeSearchMatchedConnectionIds', () => {
  const connections = [
    { id: 'conn-1', src: '10.0.0.1', dst: '10.0.0.2' },
    { id: 'conn-2', src: '192.168.1.1', dst: '192.168.1.2' },
    { id: 'conn-3', src: '10.0.0.1', dst: '192.168.1.1' },
    { id: 'conn-4', src: '172.16.0.1', dst: '10.0.0.2' },
  ]

  it('returns null when matchedNodeIds is null', () => {
    expect(computeSearchMatchedConnectionIds(connections, null)).toBeNull()
  })

  it('returns null when matchedNodeIds is undefined', () => {
    expect(computeSearchMatchedConnectionIds(connections, undefined)).toBeNull()
  })

  it('returns a Set of connection ids where src or dst is in matchedNodeIds', () => {
    const matchedNodeIds = new Set(['10.0.0.1'])
    const result = computeSearchMatchedConnectionIds(connections, matchedNodeIds)
    expect(result).toBeInstanceOf(Set)
    // conn-1: src=10.0.0.1 (matches)
    expect(result.has('conn-1')).toBe(true)
    // conn-3: src=10.0.0.1 (matches)
    expect(result.has('conn-3')).toBe(true)
    // conn-2: neither src nor dst matches
    expect(result.has('conn-2')).toBe(false)
    // conn-4: dst=10.0.0.2 (does not match 10.0.0.1)
    expect(result.has('conn-4')).toBe(false)
  })

  it('includes a connection when dst is in matchedNodeIds', () => {
    const matchedNodeIds = new Set(['10.0.0.2'])
    const result = computeSearchMatchedConnectionIds(connections, matchedNodeIds)
    // conn-1: dst=10.0.0.2 (matches)
    expect(result.has('conn-1')).toBe(true)
    // conn-4: dst=10.0.0.2 (matches)
    expect(result.has('conn-4')).toBe(true)
    // conn-2: neither matches
    expect(result.has('conn-2')).toBe(false)
    // conn-3: neither matches (dst=192.168.1.1)
    expect(result.has('conn-3')).toBe(false)
  })

  it('includes connections where either src OR dst matches', () => {
    const matchedNodeIds = new Set(['192.168.1.1'])
    const result = computeSearchMatchedConnectionIds(connections, matchedNodeIds)
    // conn-2: src=192.168.1.1 (matches)
    expect(result.has('conn-2')).toBe(true)
    // conn-3: dst=192.168.1.1 (matches)
    expect(result.has('conn-3')).toBe(true)
    expect(result.has('conn-1')).toBe(false)
    expect(result.has('conn-4')).toBe(false)
  })

  it('returns an empty Set when matchedNodeIds is an empty Set', () => {
    const result = computeSearchMatchedConnectionIds(connections, new Set())
    expect(result).toBeInstanceOf(Set)
    expect(result.size).toBe(0)
  })

  it('returns an empty Set when connections array is empty', () => {
    const matchedNodeIds = new Set(['10.0.0.1'])
    const result = computeSearchMatchedConnectionIds([], matchedNodeIds)
    expect(result).toBeInstanceOf(Set)
    expect(result.size).toBe(0)
  })

  it('handles multiple matched node ids correctly', () => {
    const matchedNodeIds = new Set(['10.0.0.1', '192.168.1.2'])
    const result = computeSearchMatchedConnectionIds(connections, matchedNodeIds)
    // conn-1: src=10.0.0.1 matches
    expect(result.has('conn-1')).toBe(true)
    // conn-2: dst=192.168.1.2 matches
    expect(result.has('conn-2')).toBe(true)
    // conn-3: src=10.0.0.1 matches
    expect(result.has('conn-3')).toBe(true)
    // conn-4: neither src(172.16.0.1) nor dst(10.0.0.2) matches
    expect(result.has('conn-4')).toBe(false)
  })
})
