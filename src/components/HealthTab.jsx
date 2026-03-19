import React from 'react'
import PerformanceScorePanel from './PerformanceScorePanel'

export default function HealthTab({
  overallHealth,
  connections,
  connectionHealthMap,
  nodeHealthMap,
  nodesComputed,
  selectedConnectionId,
  onSelectConnection,
}) {
  // Danger nodes for risk details
  const dangerNodes = nodesComputed
    .map(node => ({ node, health: nodeHealthMap.get(node.id) }))
    .filter(({ health }) => health && health.status !== 'healthy')
    .sort((a, b) => {
      if (a.health.status === b.health.status) return b.node.connectionCount - a.node.connectionCount
      return a.health.status === 'critical' ? -1 : 1
    })

  return (
    <div role="tabpanel" id="panel-health" aria-labelledby="tab-health" className="flex-1 flex flex-col overflow-hidden">
      <PerformanceScorePanel />

      {/* Health overview card */}
      <div className="rounded-xl p-3 bg-slate-800/50 border border-slate-700/60 mb-3 shrink-0">
        <div className="text-xs text-slate-400 mb-2">網路健康分數</div>
        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1 h-2 rounded-full bg-slate-700 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${overallHealth.score}%`,
                backgroundColor: overallHealth.score >= 80 ? '#22c55e' : overallHealth.score >= 50 ? '#f59e0b' : '#ef4444'
              }}
            />
          </div>
          <span className="text-sm font-mono font-semibold text-slate-100 shrink-0">
            {overallHealth.score} / 100
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <span className="text-slate-500 text-[10px]">連線:</span>
          <span className="text-green-400">🟢 {overallHealth.healthy} 健康</span>
          <span className="text-yellow-400">🟡 {overallHealth.warning} 警告</span>
          <span className="text-red-400">🔴 {overallHealth.critical} 異常</span>
        </div>
        <div className="flex items-center gap-2 text-xs flex-wrap mt-1">
          <span className="text-slate-500 text-[10px]">節點:</span>
          <span className="text-green-400">🟢 {Math.max(0, nodesComputed.length - (overallHealth.nodeCritical || 0) - (overallHealth.nodeWarning || 0))} 正常</span>
          <span className="text-yellow-400">🟡 {overallHealth.nodeWarning || 0} 警戒</span>
          <span className="text-red-400">🔴 {overallHealth.nodeCritical || 0} 高危</span>
        </div>

        {dangerNodes.length > 0 && (
          <div className="border-t border-slate-700/40 mt-2 pt-2">
            {dangerNodes.map(({ node, health }) => (
              <div
                key={node.id}
                className={`mb-1 p-2 rounded text-xs border-l-4 bg-slate-700/50 ${
                  health.status === 'critical' ? 'border-red-500' : 'border-yellow-500'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-slate-200">{node.id}</span>
                  <span className={`font-bold ${health.status === 'critical' ? 'text-red-400' : 'text-yellow-400'}`}>
                    {node.connectionCount} 條連線
                  </span>
                </div>
                <div className={`mt-0.5 ${health.status === 'critical' ? 'text-red-300' : 'text-yellow-300'}`}>
                  {health.issues[0]}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Connection health list */}
      <div className="flex-1 space-y-1.5 overflow-y-auto pr-1 custom-scrollbar">
        {[...connections]
          .sort((a, b) => {
            const order = { critical: 0, warning: 1, healthy: 2 }
            const ha = connectionHealthMap.get(a.id) ?? { status: 'healthy' }
            const hb = connectionHealthMap.get(b.id) ?? { status: 'healthy' }
            return (order[ha.status] ?? 2) - (order[hb.status] ?? 2)
          })
          .map(connection => {
            const health = connectionHealthMap.get(connection.id) ?? { status: 'healthy', score: 100, issues: [], mainMetric: '' }
            const isSelected = selectedConnectionId === connection.id
            const borderColor = health.status === 'critical' ? 'border-l-red-500' : health.status === 'warning' ? 'border-l-yellow-500' : 'border-l-green-500'
            const statusDot = health.status === 'critical' ? '🔴' : health.status === 'warning' ? '🟡' : '🟢'
            const srcLabel = connection.src || ''
            const dstLabel = connection.dst || ''
            const srcNodeHealth = nodeHealthMap.get(connection.src)
            const dstNodeHealth = nodeHealthMap.get(connection.dst)
            const ptLabel = (connection.protocolType || connection.primaryProtocolType || 'UNKNOWN').toUpperCase().replace(/-/g, '\u2011')

            return (
              <div
                key={connection.id}
                role="button"
                tabIndex={0}
                aria-label={`選取連線 ${connection.id}`}
                className={`rounded-lg p-2.5 border-l-4 cursor-pointer transition-all duration-200 ${borderColor} ${
                  isSelected
                    ? 'bg-cyan-500/15 border border-cyan-500/40 border-l-4'
                    : 'bg-slate-800/40 border border-slate-700/40 hover:bg-slate-700/40'
                }`}
                onClick={() => onSelectConnection(connection, isSelected)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onSelectConnection(connection, isSelected)
                  }
                }}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[10px] leading-none">{statusDot}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold bg-slate-700/60 text-slate-200 truncate max-w-[100px]">
                    {ptLabel}
                  </span>
                  <span className="text-[9px] text-slate-400 font-mono truncate">
                    {srcLabel}{srcNodeHealth?.status === 'critical' ? ' 🔴' : srcNodeHealth?.status === 'warning' ? ' 🟡' : ''}{' → '}{dstLabel}{dstNodeHealth?.status === 'critical' ? ' 🔴' : dstNodeHealth?.status === 'warning' ? ' 🟡' : ''}
                  </span>
                </div>
                {health.mainMetric && (
                  <div className="text-[10px] text-cyan-300 font-mono pl-4">{health.mainMetric}</div>
                )}
                {health.issues.length > 0 && health.status !== 'healthy' && (
                  <div className={`text-[10px] pl-4 mt-0.5 truncate ${health.status === 'critical' ? 'text-red-400' : 'text-yellow-400'}`}>
                    {health.issues[0]}
                  </div>
                )}
              </div>
            )
          })}
      </div>
    </div>
  )
}
