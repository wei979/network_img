import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import TlsInfoPanel from '../components/TlsInfoPanel'

const mockTlsData = {
  tls_sessions: [
    {
      connection_id: '192.168.1.1:52000-93.184.216.34:443',
      client_hello: { sni: 'example.com', tls_version: 'TLS 1.2', cipher_suite_count: 17 },
      server_hello: { tls_version: 'TLS 1.2', cipher_suite: '0xc02f (TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256)' },
      handshake_complete: true,
      has_app_data: true,
    },
    {
      connection_id: '192.168.1.1:52001-93.184.216.34:443',
      client_hello: { sni: 'api.example.com', tls_version: 'TLS 1.3', cipher_suite_count: 5 },
      server_hello: { tls_version: 'TLS 1.3', cipher_suite: '0x1301 (TLS_AES_128_GCM_SHA256)' },
      handshake_complete: true,
      has_app_data: true,
    },
  ],
  summary: {
    total_tls_connections: 2,
    tls_versions: { 'TLS 1.2': 1, 'TLS 1.3': 1 },
    unique_snis: ['example.com', 'api.example.com'],
  },
}

describe('TlsInfoPanel', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders loading state initially', () => {
    global.fetch = vi.fn(() => new Promise(() => {}))
    render(<TlsInfoPanel />)
    expect(document.querySelector('.animate-spin')).toBeTruthy()
  })

  it('renders TLS session count and SNIs after loading', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve(mockTlsData) })
    )
    render(<TlsInfoPanel />)

    await waitFor(() => {
      expect(screen.getAllByText(/2/).length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText(/example\.com/).length).toBeGreaterThanOrEqual(1)
    })
  })

  it('renders TLS version distribution', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve(mockTlsData) })
    )
    render(<TlsInfoPanel />)

    await waitFor(() => {
      expect(screen.getAllByText(/TLS 1\.2/).length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText(/TLS 1\.3/).length).toBeGreaterThanOrEqual(1)
    })
  })

  it('renders placeholder when no TLS data', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ tls_sessions: [], summary: { total_tls_connections: 0, tls_versions: {}, unique_snis: [] } })
      })
    )
    render(<TlsInfoPanel />)

    await waitFor(() => {
      expect(screen.getByText(/未偵測到 TLS|無 TLS/)).toBeTruthy()
    })
  })

  it('renders error/empty state on fetch failure', async () => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: false, status: 404 }))
    render(<TlsInfoPanel />)

    await waitFor(() => {
      expect(screen.getByText(/未偵測到 TLS|無 TLS/)).toBeTruthy()
    })
  })
})
