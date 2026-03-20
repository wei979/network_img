import React, { useState, useEffect } from 'react'
import { Lock, Loader2, ShieldCheck, ShieldAlert } from 'lucide-react'
import { S } from '../lib/swiss-tokens'

const DEPRECATED_VERSIONS = new Set(['TLS 1.0', 'TLS 1.1'])

function VersionBadge({ version }) {
  const deprecated = DEPRECATED_VERSIONS.has(version)
  return (
    <span
      className="px-1.5 py-0.5 rounded-[3px] text-[10px] font-medium"
      style={
        deprecated
          ? { background: 'rgba(245,158,11,0.2)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }
          : { background: 'rgba(34,197,94,0.2)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }
      }
    >
      {version}
    </span>
  )
}

export default function TlsInfoPanel() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch('/api/tls-info')
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(d => { if (!cancelled) setData(d) })
      .catch(() => { if (!cancelled) setData(null) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: S.text.tertiary }} />
      </div>
    )
  }

  const sessions = data?.tls_sessions || []
  const summary = data?.summary || {}

  if (!sessions.length) {
    return (
      <div className="text-center text-xs py-6" style={{ color: S.text.tertiary }}>
        <Lock className="w-6 h-6 mx-auto mb-2" style={{ color: S.text.faint }} />
        未偵測到 TLS 流量
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 text-xs">
      {/* Summary */}
      <div className="rounded-[4px] p-3" style={{ background: S.surface, border: `1px solid ${S.border}` }}>
        <div className="flex items-center gap-2 mb-2">
          <Lock className="w-4 h-4" style={{ color: S.accent }} />
          <span className="text-sm font-semibold" style={{ color: S.text.primary }}>TLS 總覽</span>
          <span className="ml-auto" style={{ color: S.text.tertiary }}>{summary.total_tls_connections || 0} 連線</span>
        </div>

        {/* Version distribution */}
        {Object.keys(summary.tls_versions || {}).length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {Object.entries(summary.tls_versions).map(([ver, count]) => (
              <div key={ver} className="flex items-center gap-1">
                <VersionBadge version={ver} />
                <span style={{ color: S.text.secondary }}>x{count}</span>
              </div>
            ))}
          </div>
        )}

        {/* SNI list */}
        {summary.unique_snis?.length > 0 && (
          <div style={{ color: S.text.secondary }}>
            <span style={{ color: S.text.tertiary }}>SNI: </span>
            {summary.unique_snis.join(', ')}
          </div>
        )}
      </div>

      {/* Session list */}
      <div className="space-y-1.5">
        {sessions.map((sess, idx) => {
          const sni = sess.client_hello?.sni
          const serverVer = sess.server_hello?.tls_version
          const cipher = sess.server_hello?.cipher_suite
          const deprecated = serverVer && DEPRECATED_VERSIONS.has(serverVer)

          return (
            <div
              key={sess.connection_id || idx}
              className="rounded-[4px] p-2.5"
              style={
                deprecated
                  ? { background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)' }
                  : { background: S.surface, border: `1px solid ${S.border}` }
              }
            >
              <div className="flex items-center gap-1.5 mb-1">
                {deprecated
                  ? <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#f59e0b' }} />
                  : <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#22c55e' }} />
                }
                <span className="font-medium truncate" style={{ color: S.text.primary }}>
                  {sni || sess.connection_id}
                </span>
              </div>

              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px]" style={{ color: S.text.secondary }}>
                {serverVer && (
                  <span>
                    版本: <VersionBadge version={serverVer} />
                  </span>
                )}
                {cipher && (
                  <span className="truncate max-w-[200px]" title={cipher}>
                    套件: <span style={{ fontFamily: S.font.mono, color: S.text.primary }}>{cipher.split('(')[1]?.replace(')', '') || cipher}</span>
                  </span>
                )}
              </div>

              <div className="flex gap-3 mt-1 text-[10px]">
                <span style={{ color: sess.handshake_complete ? '#22c55e' : '#f59e0b' }}>
                  {sess.handshake_complete ? '握手完成 ✓' : '握手未完成'}
                </span>
                <span style={{ color: sess.has_app_data ? '#22c55e' : S.text.tertiary }}>
                  {sess.has_app_data ? '加密傳輸 ✓' : '無加密資料'}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
