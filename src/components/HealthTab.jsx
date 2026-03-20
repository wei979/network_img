import React from 'react'
import { S } from '../lib/swiss-tokens'
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
      <div className="rounded-[4px] p-3 mb-3 shrink-0" style={{ background: S.surface, border: `1px solid ${S.border}` }}>
        <div className="text-xs mb-2" style={{ color: S.text.secondary }}>網路健康分數</div>
        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1 h-2 rounded-[3px] overflow-hidden" style={{ background: S.border }}>
            <div
              className="h-full rounded-[3px] transition-all duration-500"
              style={{
                width: `${overallHealth.score}%`,
                backgroundColor: overallHealth.score >= 80 ? '#22c55e' : overallHealth.score >= 50 ? '#f59e0b' : '#ef4444'
              }}
            />
          </div>
          <span className="text-sm font-semibold shrink-0" style={{ fontFamily: S.font.mono, color: S.text.primary }}>
            {overallHealth.score} / 100
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <span className="text-[10px]" style={{ color: S.text.tertiary }}>連線:</span>
          <span style={{ color: '#22c55e' }}>🟢 {overallHealth.healthy} 健康</span>
          <span style={{ color: '#f59e0b' }}>🟡 {overallHealth.warning} 警告</span>
          <span style={{ color: '#ef4444' }}>🔴 {overallHealth.critical} 異常</span>
        </div>
        <div className="flex items-center gap-2 text-xs flex-wrap mt-1">
          <span className="text-[10px]" style={{ color: S.text.tertiary }}>節點:</span>
          <span style={{ color: '#22c55e' }}>🟢 {Math.max(0, nodesComputed.length - (overallHealth.nodeCritical || 0) - (overallHealth.nodeWarning || 0))} 正常</span>
          <span style={{ color: '#f59e0b' }}>🟡 {overallHealth.nodeWarning || 0} 警戒</span>
          <span style={{ color: '#ef4444' }}>🔴 {overallHealth.nodeCritical || 0} 高危</span>
        </div>

        {dangerNodes.length > 0 && (
          <div className="mt-2 pt-2" style={{ borderTop: `1px solid ${S.border}` }}>
            {dangerNodes.map(({ node, health }) => (
              <div
                key={node.id}
                className="mb-1 p-2 rounded-[3px] text-xs"
                style={{
                  background: S.surfaceHover,
                  borderLeft: `4px solid ${health.status === 'critical' ? '#ef4444' : '#f59e0b'}`,
                }}
              >
                <div className="flex items-center justify-between">
                  <span style={{ fontFamily: S.font.mono, color: S.text.primary }}>{node.id}</span>
                  <span className="font-bold" style={{ color: health.status === 'critical' ? '#ef4444' : '#f59e0b' }}>
                    {node.connectionCount} 條連線
                  </span>
                </div>
                <div className="mt-0.5" style={{ color: health.status === 'critical' ? '#fca5a5' : '#fde68a' }}>
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
            const borderLeftColor = health.status === 'critical' ? '#ef4444' : health.status === 'warning' ? '#f59e0b' : '#22c55e'
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
                className="rounded-[4px] p-2.5 cursor-pointer transition-all duration-200"
                style={{
                  borderLeft: `4px solid ${borderLeftColor}`,
                  background: isSelected ? `${S.accent}15` : S.surface,
                  border: isSelected
                    ? `1px solid ${S.accent}40`
                    : `1px solid ${S.border}`,
                  borderLeftWidth: '4px',
                  borderLeftColor: borderLeftColor,
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = S.surfaceHover
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = S.surface
                  }
                }}
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
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-[3px] font-semibold truncate max-w-[100px]"
                    style={{ fontFamily: S.font.mono, background: S.surfaceHover, color: S.text.primary }}
                  >
                    {ptLabel}
                  </span>
                  <span className="text-[9px] truncate" style={{ fontFamily: S.font.mono, color: S.text.secondary }}>
                    {srcLabel}{srcNodeHealth?.status === 'critical' ? ' 🔴' : srcNodeHealth?.status === 'warning' ? ' 🟡' : ''}{' → '}{dstLabel}{dstNodeHealth?.status === 'critical' ? ' 🔴' : dstNodeHealth?.status === 'warning' ? ' 🟡' : ''}
                  </span>
                </div>
                {health.mainMetric && (
                  <div className="text-[10px] pl-4" style={{ fontFamily: S.font.mono, color: S.accent }}>{health.mainMetric}</div>
                )}
                {health.issues.length > 0 && health.status !== 'healthy' && (
                  <div className="text-[10px] pl-4 mt-0.5 truncate" style={{ color: health.status === 'critical' ? '#ef4444' : '#f59e0b' }}>
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
