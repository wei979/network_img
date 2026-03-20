import React from 'react'
import { X } from 'lucide-react'
import { PROTOCOL_COLORS } from '../lib/ProtocolStates'
import { S } from '../lib/swiss-tokens'
import { truncateIpLabel, getDepthLabel } from '../lib/nodeDashboard.js'

export default function NodesTab({
  nodesComputed,
  searchQuery,
  setSearchQuery,
  searchMatchedNodeIds,
  searchMatchedConnectionIds,
  geoInfo,
}) {
  return (
    <div role="tabpanel" id="panel-nodes" aria-labelledby="tab-nodes" className="contents">
      {/* Search Box */}
      <div className="relative mb-3">
        <input
          type="text"
          placeholder="搜尋 IP 位址..."
          aria-label="搜尋 IP 位址"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-[3px] px-4 py-2.5 text-sm focus:outline-none transition-colors"
          style={{
            background: S.surface,
            border: `1px solid ${S.border}`,
            color: S.text.primary,
            fontFamily: S.font.sans,
          }}
        />
        {searchQuery && (
          <button
            type="button"
            aria-label="清除搜尋"
            onClick={() => setSearchQuery('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors"
            style={{ color: S.text.tertiary }}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Match count */}
      {searchMatchedNodeIds !== null && (
        <div className="text-xs mb-3 px-1" style={{ color: S.text.secondary }}>
          找到 <span className="font-semibold" style={{ color: S.accent }}>{searchMatchedNodeIds.size}</span> 節點，
          <span className="font-semibold" style={{ color: S.accent }}>{searchMatchedConnectionIds?.size || 0}</span> 條連線
        </div>
      )}

      {/* Node List */}
      <div className="flex-1 space-y-2 overflow-y-auto pr-1 custom-scrollbar">
        {nodesComputed
          .filter(node => {
            if (searchMatchedNodeIds === null) return true
            return searchMatchedNodeIds.has(node.id)
          })
          .sort((a, b) => {
            if (a.isCenter) return -1
            if (b.isCenter) return 1
            return b.connectionCount - a.connectionCount
          })
          .map(node => {
            const depthLabel = getDepthLabel(node.depth, node.isCenter)
            const isHighlighted = searchMatchedNodeIds?.has(node.id)

            return (
              <div
                key={node.id}
                role="button"
                tabIndex={0}
                aria-label={`選取節點 ${node.id}`}
                className="rounded-[4px] p-3 transition-all duration-300 cursor-pointer"
                style={
                  isHighlighted
                    ? {
                        background: `${S.accent}15`,
                        border: `1px solid ${S.accent}50`,
                      }
                    : {
                        background: S.surface,
                        border: `1px solid ${S.border}`,
                      }
                }
                onMouseEnter={(e) => {
                  if (!isHighlighted) {
                    e.currentTarget.style.background = S.surfaceHover
                    e.currentTarget.style.borderColor = S.borderStrong
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isHighlighted) {
                    e.currentTarget.style.background = S.surface
                    e.currentTarget.style.borderColor = S.border
                  }
                }}
                onClick={() => setSearchQuery(node.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setSearchQuery(node.id)
                  }
                }}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="text-sm truncate max-w-[160px]"
                    style={{
                      fontFamily: S.font.mono,
                      color: isHighlighted ? S.accent : S.text.primary,
                      fontWeight: isHighlighted ? 600 : 400,
                    }}
                    title={node.label}
                  >
                    {truncateIpLabel(node.label)}
                  </span>
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-[3px] font-medium shrink-0 ml-1"
                    style={
                      node.isCenter
                        ? { background: '#f59e0b20', color: '#f59e0b', border: '1px solid #f59e0b30' }
                        : node.depth === 1
                          ? { background: '#3b82f620', color: '#3b82f6', border: '1px solid #3b82f630' }
                          : { background: S.surface, color: S.text.secondary, border: `1px solid ${S.border}` }
                    }
                  >
                    {depthLabel}
                  </span>
                </div>

                {/* Geo label */}
                {geoInfo[node.label] && (
                  <div className="text-[10px] mt-0.5" style={{ color: S.text.secondary }}>
                    {geoInfo[node.label].type === 'private' ? '🏠' : geoInfo[node.label].type === 'loopback' ? '🔄' : '🌐'}{' '}
                    {geoInfo[node.label].label}
                  </div>
                )}

                <div className="flex flex-wrap gap-1 mt-2">
                  {node.protocols.map(proto => (
                    <span
                      key={proto}
                      className="text-[10px] px-1.5 py-0.5 rounded-[3px] uppercase"
                      style={{
                        fontFamily: S.font.mono,
                        backgroundColor: `${PROTOCOL_COLORS[proto.toLowerCase()] || '#64748b'}20`,
                        color: PROTOCOL_COLORS[proto.toLowerCase()] || '#94a3b8',
                        border: `1px solid ${PROTOCOL_COLORS[proto.toLowerCase()] || '#64748b'}40`
                      }}
                    >
                      {proto}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between mt-2 text-xs" style={{ color: S.text.tertiary }}>
                  <span>連線數</span>
                  <span style={{ fontFamily: S.font.mono, color: S.text.secondary }}>{node.connectionCount}</span>
                </div>
              </div>
            )
          })}
      </div>
    </div>
  )
}
