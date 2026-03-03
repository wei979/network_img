import { describe, it, expect } from 'vitest'
import { PacketParticleSystem } from '../lib/PacketParticleSystem'

// TCP 握手封包：SYN→SYN-ACK→ACK，時間跨度 0.24ms（會被拉長到 20s）
// 歸一化後：SYN≈0.0, SYN-ACK≈0.5, ACK≈1.0
function makeTcpHandshakePackets() {
  return [
    { timestamp: 0.000000, length: 60, headers: { tcp: { flags: 'SYN' } },
      fiveTuple: { srcIp: '192.168.1.1', srcPort: '12345', dstIp: '10.0.0.1', dstPort: '80', protocol: 'tcp' } },
    { timestamp: 0.000120, length: 60, headers: { tcp: { flags: 'SYN,ACK' } },
      fiveTuple: { srcIp: '10.0.0.1', srcPort: '80', dstIp: '192.168.1.1', dstPort: '12345', protocol: 'tcp' } },
    { timestamp: 0.000240, length: 60, headers: { tcp: { flags: 'ACK' } },
      fiveTuple: { srcIp: '192.168.1.1', srcPort: '12345', dstIp: '10.0.0.1', dstPort: '80', protocol: 'tcp' } },
  ]
}

// 顏色常數（來自 PacketParticleSystem 的 TCP flag 顏色對應）
const COLOR_SYN_ACK = '#14b8a6'
const COLOR_DEFAULT = '#60a5fa' // 純 ACK / 一般封包預設藍色

describe('PacketParticleSystem._initializeTimeline', () => {
  it('stretches short captures to at least 20 seconds', () => {
    const ps = new PacketParticleSystem(makeTcpHandshakePackets(), null, { loop: true })
    expect(ps.duration).toBeGreaterThanOrEqual(20000)
  })

  it('assigns distinct normalizedTime values preserving temporal order', () => {
    const ps = new PacketParticleSystem(makeTcpHandshakePackets(), null, { loop: true })
    const times = ps.packets.map(p => p._normalizedTime)
    expect(times[0]).toBeLessThan(times[1])
    expect(times[1]).toBeLessThan(times[2])
    expect(times[0]).toBeCloseTo(0.0)
    expect(times[1]).toBeCloseTo(0.5)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// BUG: wrap-around condition in getActiveParticles() (line ~325) was:
//   progress < packetProgress && progress + 1.0 >= packetProgress + displayDuration
//
// For SYN-ACK with packetProgress=0.5, displayDuration≈0.05:
//   - 2nd sub-condition: progress >= 0.5 + 0.05 - 1.0 = -0.45 → ALWAYS TRUE (progress≥0)
//   - Simplifies to: progress < 0.5  →  fires for entire first half of the cycle
//   - travelProgress = (progress+1.0 - 0.5) / 0.05  →  huge values (10–19)
//   - After modulo-while: particle oscillates through 0→1 many times per cycle
//   → User sees ONE packet appearing many times before it should
//
// CORRECT: wrap only when window genuinely straddles 1.0 boundary:
//   packetProgress + displayDuration > 1.0  AND  progress < (packetProgress + displayDuration - 1.0)
// ─────────────────────────────────────────────────────────────────────────────
describe('PacketParticleSystem.getActiveParticles — wrap-around bug', () => {

  it('does NOT show SYN-ACK before its normalizedTime trigger point', () => {
    const ps = new PacketParticleSystem(makeTcpHandshakePackets(), null, {
      loop: true,
      connectionId: 'tcp-192.168.1.1-12345-10.0.0.1-80',
    })

    // SYN-ACK normalizedTime ≈ 0.5 → should only appear at 50–55% of the 20s cycle
    // At progress=0.1 (2s into 20s) it must NOT show
    ps.currentTime = ps.duration * 0.1
    const particles = ps.getActiveParticles()
    const synAckParticles = particles.filter(p => p.color === COLOR_SYN_ACK)

    expect(synAckParticles.length).toBe(0)
  })

  it('does NOT show SYN-ACK at progress=0.3 (before its 0.5 trigger)', () => {
    const ps = new PacketParticleSystem(makeTcpHandshakePackets(), null, {
      loop: true,
      connectionId: 'tcp-192.168.1.1-12345-10.0.0.1-80',
    })

    ps.currentTime = ps.duration * 0.3
    const particles = ps.getActiveParticles()
    const synAckParticles = particles.filter(p => p.color === COLOR_SYN_ACK)

    expect(synAckParticles.length).toBe(0)
  })

  it('SYN-ACK never appears before its normalizedTime trigger across full cycle', () => {
    // The key property: no packet should appear BEFORE its _normalizedTime trigger.
    // The old bug made SYN-ACK appear throughout the first 50% of the cycle.
    const ps = new PacketParticleSystem(makeTcpHandshakePackets(), null, {
      loop: true,
      connectionId: 'tcp-192.168.1.1-12345-10.0.0.1-80',
    })

    const synAckNorm = ps.packets[1]._normalizedTime // ≈ 0.5
    const SAMPLES = 40

    for (let i = 0; i < SAMPLES; i++) {
      const progress = i / SAMPLES
      if (progress >= synAckNorm) break // stop at SYN-ACK trigger — remaining window is correct

      ps.currentTime = ps.duration * progress
      const synAckParticles = ps.getActiveParticles().filter(p => p.color === COLOR_SYN_ACK)
      expect(synAckParticles.length).toBe(0)
    }
  })

  it('shows SYN-ACK exactly at its trigger progress window', () => {
    const ps = new PacketParticleSystem(makeTcpHandshakePackets(), null, {
      loop: true,
      connectionId: 'tcp-192.168.1.1-12345-10.0.0.1-80',
    })

    const synAckNorm = ps.packets[1]._normalizedTime  // ≈ 0.5
    ps.currentTime = ps.duration * (synAckNorm + 0.01) // slightly after trigger

    const particles = ps.getActiveParticles()
    const synAckParticles = particles.filter(p => p.color === COLOR_SYN_ACK)

    expect(synAckParticles.length).toBeGreaterThan(0)
  })

  it('ACK at normalizedTime=1.0 appears at start of cycle via wrap, absent mid-cycle', () => {
    // ACK gets _normalizedTime = 1.0 (last packet at maxTime).
    // Normal window [1.0, 1.0+displayDuration) is unreachable (progress is always < 1.0).
    // Wrap branch: 1.0 + displayDuration > 1.0 is always true, so ACK wraps to the
    // beginning of each cycle and shows during progress ∈ [0, displayDuration).
    const ps = new PacketParticleSystem(makeTcpHandshakePackets(), null, {
      loop: true,
      connectionId: 'tcp-192.168.1.1-12345-10.0.0.1-80',
    })

    const ackNorm = ps.packets[2]._normalizedTime
    expect(ackNorm).toBeCloseTo(1.0)

    const ackDisplayDuration = ps.packets[2]._travelTime / (ps.duration / 1000)

    // Inside wrap window (progress = half of displayDuration) → ACK should appear
    ps.currentTime = ps.duration * (ackDisplayDuration * 0.5)
    const particlesWrapped = ps.getActiveParticles().filter(p => p.color === COLOR_DEFAULT && p.index === 2)
    expect(particlesWrapped.length).toBeGreaterThan(0)

    // Mid-cycle (past wrap window, before 1.0 normal window) → ACK absent
    ps.currentTime = ps.duration * 0.5
    const particlesMid = ps.getActiveParticles().filter(p => p.color === COLOR_DEFAULT && p.index === 2)
    expect(particlesMid.length).toBe(0)
  })

  it('wraps a packet whose display window genuinely straddles the 1.0 boundary', () => {
    // Single packet positioned at 0.97 with travel time giving displayDuration=0.05
    // → window spans 0.97 → 1.02 → straddles; wrap should show from progress 0.0 to 0.02
    const packets = [{
      timestamp: 0, length: 60,
      headers: { tcp: { flags: 'SYN' } },
      fiveTuple: { srcIp: '1.1.1.1', srcPort: '1', dstIp: '2.2.2.2', dstPort: '2' },
    }]
    const ps = new PacketParticleSystem(packets, null, { loop: true })
    ps.packets[0]._normalizedTime = 0.97
    ps.packets[0]._travelTime = 1.0 // 1s / 20s total → displayDuration = 0.05

    // Inside the wrap window (0.0 → 0.02) → should show
    ps.currentTime = ps.duration * 0.01
    expect(ps.getActiveParticles().length).toBeGreaterThan(0)

    // Outside the wrap window (progress=0.04 > 0.02) AND before normal window (0.97) → should NOT show
    ps.currentTime = ps.duration * 0.04
    expect(ps.getActiveParticles().length).toBe(0)
  })
})
