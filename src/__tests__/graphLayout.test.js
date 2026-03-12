import { describe, it, expect } from 'vitest'
import { parseTimelineId, buildAdjacencyAndDepth } from '../lib/graphLayout.js'

// ---------------------------------------------------------------------------
// parseTimelineId tests
// ---------------------------------------------------------------------------
describe('parseTimelineId', () => {
  it('parses standard tcp timeline id', () => {
    const timeline = { id: 'tcp-10.0.0.1-1234-10.0.0.2-80', protocolType: 'tcp-handshake' }
    const result = parseTimelineId(timeline)
    expect(result).not.toBeNull()
    expect(result.src.ip).toBe('10.0.0.1')
    expect(result.src.port).toBe('1234')
    expect(result.dst.ip).toBe('10.0.0.2')
    expect(result.dst.port).toBe('80')
    expect(result.protocol).toBe('tcp')
    expect(result.protocolType).toBe('tcp-handshake')
  })

  it('parses timeline id with subtype (tcp-teardown)', () => {
    const timeline = { id: 'tcp-teardown-10.128.0.2-5416-10.0.0.2-80' }
    const result = parseTimelineId(timeline)
    expect(result).not.toBeNull()
    expect(result.src.ip).toBe('10.128.0.2')
    expect(result.dst.ip).toBe('10.0.0.2')
    expect(result.protocol).toBe('tcp-teardown')
  })

  it('returns null for null timeline', () => {
    expect(parseTimelineId(null)).toBeNull()
  })

  it('returns null for timeline without id', () => {
    expect(parseTimelineId({})).toBeNull()
  })

  it('returns null for id without valid IP pattern', () => {
    expect(parseTimelineId({ id: 'no-ips-here' })).toBeNull()
  })

  it('uses protocolType from timeline when present', () => {
    const timeline = { id: 'udp-10.0.0.1-53-8.8.8.8-53', protocolType: 'dns-query' }
    const result = parseTimelineId(timeline)
    expect(result.protocolType).toBe('dns-query')
  })

  it('falls back to protocol part when protocolType not set', () => {
    const timeline = { id: 'udp-10.0.0.1-53-8.8.8.8-53' }
    const result = parseTimelineId(timeline)
    expect(result.protocolType).toBe('udp')
  })
})

// ---------------------------------------------------------------------------
// Helper to create minimal timeline objects
// ---------------------------------------------------------------------------
function makeTimeline(id, protocolType) {
  return { id, protocolType: protocolType || id.split('-')[0] }
}

// ---------------------------------------------------------------------------
// buildAdjacencyAndDepth tests
// ---------------------------------------------------------------------------
describe('buildAdjacencyAndDepth', () => {
  it('returns empty maps for empty timelines', () => {
    const result = buildAdjacencyAndDepth([])
    expect(result.centerIp).toBeNull()
    expect(result.depthMap.size).toBe(0)
    expect(result.parentMap.size).toBe(0)
    expect(result.connectionCounts.size).toBe(0)
  })

  it('handles timelines with no parseable ids without crashing', () => {
    const result = buildAdjacencyAndDepth([{ id: 'garbage' }, { id: null }])
    expect(result.centerIp).toBeNull()
    expect(result.depthMap.size).toBe(0)
  })

  it('star topology: A is center, B/C/D all depth=1 with parent=A', () => {
    // A connects to B, C, D — A has 3 connections, max
    const timelines = [
      makeTimeline('tcp-10.0.0.1-1000-10.0.0.2-80'),   // A -> B
      makeTimeline('tcp-10.0.0.1-1001-10.0.0.3-80'),   // A -> C
      makeTimeline('tcp-10.0.0.1-1002-10.0.0.4-80'),   // A -> D
    ]
    const result = buildAdjacencyAndDepth(timelines)

    // A (10.0.0.1) has 3 connections → must be center
    expect(result.centerIp).toBe('10.0.0.1')

    // Center is depth 0
    expect(result.depthMap.get('10.0.0.1')).toBe(0)

    // B, C, D are depth 1
    expect(result.depthMap.get('10.0.0.2')).toBe(1)
    expect(result.depthMap.get('10.0.0.3')).toBe(1)
    expect(result.depthMap.get('10.0.0.4')).toBe(1)

    // All leaves point back to A
    expect(result.parentMap.get('10.0.0.2')).toBe('10.0.0.1')
    expect(result.parentMap.get('10.0.0.3')).toBe('10.0.0.1')
    expect(result.parentMap.get('10.0.0.4')).toBe('10.0.0.1')

    // Center has no parent
    expect(result.parentMap.has('10.0.0.1')).toBe(false)
  })

  it('3-level chain: A->B->C, A is center, B is depth 1, C is depth 2', () => {
    // A appears in 2 timelines (connects to B and is referenced by it via adjacency)
    // B appears in 2 timelines (connects to A and C)
    // C appears in 1 timeline
    // So B is actually the max: A-B timeline: A gets +1, B gets +1; B-C timeline: B gets +1, C gets +1
    // A=1, B=2, C=1 → center = B
    // Rewrite: to make A the center we need A to have 2 connections: A-B AND A-C
    // then B-C forms a second edge
    // A=2, B=2, C=1 → tie between A and B; Map iteration order determines winner
    // Use unambiguous: A-B, A-C, A-D to make A center (3), and then B-E (B=2) still less than A
    // For 3-level chain test: use A-B (A=1,B=1), B-C (B=2,C=1) → center=B (depth 0)
    // A is depth 1 (parent B), C is depth 1 (parent B)
    // That's not a 3-level chain from A's perspective.
    // Proper 3-level chain: need one node with most connections.
    // Let's use: A-B (x2 edges to make A=2), B-C (1 edge, B=3 total via A-B twice)
    // Actually let's do:
    //   A->B (A=1, B=1)
    //   A->C (A=2, C=1)  → A is center with 2
    //   B->D (B=2, D=1)  → B is depth 1, D is depth 2
    // This gives 3 levels: A(depth0) - B(depth1) - D(depth2), and A-C(depth1)
    const timelines = [
      makeTimeline('tcp-10.0.0.1-1000-10.0.0.2-80'),  // A-B
      makeTimeline('tcp-10.0.0.1-1001-10.0.0.3-80'),  // A-C
      makeTimeline('tcp-10.0.0.2-2000-10.0.0.4-80'),  // B-D
    ]
    const result = buildAdjacencyAndDepth(timelines)

    // A(10.0.0.1) = 2 connections, B(10.0.0.2) = 2 connections (A-B + B-D)
    // C(10.0.0.3) = 1, D(10.0.0.4) = 1
    // A and B tied at 2 — the one encountered first in Map iteration wins
    // Since Map order follows insertion, A is first inserted (from first timeline src)
    // But Map.forEach order depends on insertion; center picks max strictly (>)
    // A=2 is set first; when B=2 is encountered, 2 > 2 is false → A stays center
    expect(result.centerIp).toBe('10.0.0.1')

    expect(result.depthMap.get('10.0.0.1')).toBe(0)
    expect(result.depthMap.get('10.0.0.2')).toBe(1)
    expect(result.depthMap.get('10.0.0.3')).toBe(1)
    expect(result.depthMap.get('10.0.0.4')).toBe(2)

    expect(result.parentMap.get('10.0.0.2')).toBe('10.0.0.1')
    expect(result.parentMap.get('10.0.0.3')).toBe('10.0.0.1')
    expect(result.parentMap.get('10.0.0.4')).toBe('10.0.0.2')
  })

  it('leaf siblings: A-B, A-C, B-D, B-E → B is center; D and E are depth 1, C is depth 2', () => {
    const timelines = [
      makeTimeline('tcp-10.0.0.1-1000-10.0.0.2-80'),  // A-B
      makeTimeline('tcp-10.0.0.1-1001-10.0.0.3-80'),  // A-C
      makeTimeline('tcp-10.0.0.2-2000-10.0.0.4-80'),  // B-D
      makeTimeline('tcp-10.0.0.2-2001-10.0.0.5-80'),  // B-E
    ]
    const result = buildAdjacencyAndDepth(timelines)

    // A=2 connections, B=3 connections (A-B, B-D, B-E), C=1, D=1, E=1
    // B has max (3) → B is center
    expect(result.centerIp).toBe('10.0.0.2')

    expect(result.depthMap.get('10.0.0.2')).toBe(0)
    expect(result.depthMap.get('10.0.0.1')).toBe(1)
    expect(result.depthMap.get('10.0.0.3')).toBe(2) // C connects to A which is depth 1
    expect(result.depthMap.get('10.0.0.4')).toBe(1)
    expect(result.depthMap.get('10.0.0.5')).toBe(1)

    // D and E are direct neighbors of B (center), so depth 1
    // A is depth 1 (neighbor of B)
    // C is depth 2 (neighbor of A which is depth 1)
    expect(result.parentMap.get('10.0.0.4')).toBe('10.0.0.2')
    expect(result.parentMap.get('10.0.0.5')).toBe('10.0.0.2')
    expect(result.parentMap.get('10.0.0.1')).toBe('10.0.0.2')
    expect(result.parentMap.get('10.0.0.3')).toBe('10.0.0.1')
  })

  it('single timeline: both nodes present, more-connected node becomes center', () => {
    const timelines = [
      makeTimeline('tcp-192.168.1.1-5000-8.8.8.8-53'),
    ]
    const result = buildAdjacencyAndDepth(timelines)

    // Both nodes have count=1, tied; first one inserted (192.168.1.1 as src) wins
    expect(result.centerIp).not.toBeNull()
    expect(result.depthMap.size).toBe(2)
    expect(result.depthMap.get(result.centerIp)).toBe(0)

    // The non-center is depth 1
    const nonCenter = result.centerIp === '192.168.1.1' ? '8.8.8.8' : '192.168.1.1'
    expect(result.depthMap.get(nonCenter)).toBe(1)
    expect(result.parentMap.get(nonCenter)).toBe(result.centerIp)
  })

  it('connectionCounts reflects actual count of timeline appearances per ip', () => {
    const timelines = [
      makeTimeline('tcp-10.0.0.1-1000-10.0.0.2-80'),
      makeTimeline('tcp-10.0.0.1-1001-10.0.0.3-80'),
    ]
    const result = buildAdjacencyAndDepth(timelines)
    expect(result.connectionCounts.get('10.0.0.1')).toBe(2)
    expect(result.connectionCounts.get('10.0.0.2')).toBe(1)
    expect(result.connectionCounts.get('10.0.0.3')).toBe(1)
  })

  it('adjacency is bidirectional', () => {
    const timelines = [makeTimeline('tcp-10.0.0.1-1000-10.0.0.2-80')]
    const result = buildAdjacencyAndDepth(timelines)
    expect(result.adjacency.get('10.0.0.1').has('10.0.0.2')).toBe(true)
    expect(result.adjacency.get('10.0.0.2').has('10.0.0.1')).toBe(true)
  })
})
