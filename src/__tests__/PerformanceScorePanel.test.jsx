import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import PerformanceScorePanel from '../components/PerformanceScorePanel'

const mockPerformanceData = {
  overall: 78,
  grade: 'B',
  latency: {
    score: 85, avg_rtt_ms: 42.3,
    min_rtt_ms: 12.1, max_rtt_ms: 98.5,
    grade: 'A', sample_count: 15,
  },
  packet_loss: {
    score: 70, retransmission_rate: 0.028,
    retransmission_count: 12, total_tcp_packets: 428,
    grade: 'B',
  },
  throughput: {
    score: 75, bytes_per_second: 524288,
    total_bytes: 7340032, duration_seconds: 14.0,
    grade: 'B',
  },
}

describe('PerformanceScorePanel', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders loading state initially', () => {
    global.fetch = vi.fn(() => new Promise(() => {})) // never resolves
    render(<PerformanceScorePanel />)
    expect(document.querySelector('.animate-spin')).toBeTruthy()
  })

  it('renders overall score and grade after loading', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve(mockPerformanceData) })
    )
    render(<PerformanceScorePanel />)

    await waitFor(() => {
      expect(screen.getByText('78')).toBeTruthy()
      // Multiple 'B' grades exist; just verify at least one renders
      expect(screen.getAllByText('B').length).toBeGreaterThanOrEqual(1)
    })
  })

  it('renders all three sub-scores', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve(mockPerformanceData) })
    )
    render(<PerformanceScorePanel />)

    await waitFor(() => {
      expect(screen.getByText('85')).toBeTruthy()  // latency score
      expect(screen.getByText('70')).toBeTruthy()  // packet loss score
      expect(screen.getByText('75')).toBeTruthy()  // throughput score
    })
  })

  it('renders placeholder when API returns empty', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    )
    render(<PerformanceScorePanel />)

    await waitFor(() => {
      expect(screen.getByText(/上傳.*PCAP|無資料/i)).toBeTruthy()
    })
  })

  it('renders error state when fetch fails', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: false, status: 404 })
    )
    render(<PerformanceScorePanel />)

    await waitFor(() => {
      expect(screen.getByText(/上傳.*PCAP|無資料/i)).toBeTruthy()
    })
  })
})
