import React, { useState, useEffect } from 'react'
import { Lock, Loader2, ShieldCheck, ShieldAlert } from 'lucide-react'

const DEPRECATED_VERSIONS = new Set(['TLS 1.0', 'TLS 1.1'])

function VersionBadge({ version }) {
  const deprecated = DEPRECATED_VERSIONS.has(version)
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
      deprecated
        ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
        : 'bg-green-500/20 text-green-400 border border-green-500/30'
    }`}>
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
        <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
      </div>
    )
  }

  const sessions = data?.tls_sessions || []
  const summary = data?.summary || {}

  if (!sessions.length) {
    return (
      <div className="text-center text-slate-500 text-xs py-6">
        <Lock className="w-6 h-6 mx-auto mb-2 text-slate-600" />
        未偵測到 TLS 流量
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 text-xs">
      {/* Summary */}
      <div className="rounded-xl p-3 bg-slate-800/50 border border-slate-700/60">
        <div className="flex items-center gap-2 mb-2">
          <Lock className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-semibold text-slate-200">TLS 總覽</span>
          <span className="text-slate-500 ml-auto">{summary.total_tls_connections || 0} 連線</span>
        </div>

        {/* Version distribution */}
        {Object.keys(summary.tls_versions || {}).length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {Object.entries(summary.tls_versions).map(([ver, count]) => (
              <div key={ver} className="flex items-center gap-1">
                <VersionBadge version={ver} />
                <span className="text-slate-400">x{count}</span>
              </div>
            ))}
          </div>
        )}

        {/* SNI list */}
        {summary.unique_snis?.length > 0 && (
          <div className="text-slate-400">
            <span className="text-slate-500">SNI: </span>
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
              className={`rounded-lg p-2.5 border ${
                deprecated
                  ? 'bg-yellow-500/5 border-yellow-500/20'
                  : 'bg-slate-800/50 border-slate-700/40'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                {deprecated
                  ? <ShieldAlert className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
                  : <ShieldCheck className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                }
                <span className="text-slate-200 font-medium truncate">
                  {sni || sess.connection_id}
                </span>
              </div>

              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-slate-400">
                {serverVer && (
                  <span>
                    版本: <VersionBadge version={serverVer} />
                  </span>
                )}
                {cipher && (
                  <span className="truncate max-w-[200px]" title={cipher}>
                    套件: <span className="text-slate-300">{cipher.split('(')[1]?.replace(')', '') || cipher}</span>
                  </span>
                )}
              </div>

              <div className="flex gap-3 mt-1 text-[10px]">
                <span className={sess.handshake_complete ? 'text-green-400' : 'text-yellow-400'}>
                  {sess.handshake_complete ? '握手完成 ✓' : '握手未完成'}
                </span>
                <span className={sess.has_app_data ? 'text-green-400' : 'text-slate-500'}>
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
