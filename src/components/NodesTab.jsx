import React from 'react'
import { X } from 'lucide-react'
import { PROTOCOL_COLORS } from '../lib/ProtocolStates'
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
          className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-colors"
        />
        {searchQuery && (
          <button
            type="button"
            aria-label="清除搜尋"
            onClick={() => setSearchQuery('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Match count */}
      {searchMatchedNodeIds !== null && (
        <div className="text-xs text-slate-400 mb-3 px-1">
          找到 <span className="text-cyan-400 font-semibold">{searchMatchedNodeIds.size}</span> 節點，
          <span className="text-cyan-400 font-semibold">{searchMatchedConnectionIds?.size || 0}</span> 條連線
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
                className={`rounded-xl p-3 transition-all duration-300 cursor-pointer ${
                  isHighlighted
                    ? 'bg-cyan-500/15 border border-cyan-500/50 shadow-lg shadow-cyan-500/10'
                    : 'bg-slate-800/40 border border-slate-700/50 hover:bg-slate-700/40 hover:border-slate-600'
                }`}
                onClick={() => setSearchQuery(node.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setSearchQuery(node.id)
                  }
                }}
              >
                <div className="flex items-center justify-between">
                  <span className={`font-mono text-sm truncate max-w-[160px] ${isHighlighted ? 'text-cyan-200 font-semibold' : 'text-slate-200'}`} title={node.label}>
                    {truncateIpLabel(node.label)}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ml-1 ${
                    node.isCenter
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : node.depth === 1
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        : 'bg-slate-600/30 text-slate-400 border border-slate-600/40'
                  }`}>
                    {depthLabel}
                  </span>
                </div>

                {/* Geo label */}
                {geoInfo[node.label] && (
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {geoInfo[node.label].type === 'private' ? '🏠' : geoInfo[node.label].type === 'loopback' ? '🔄' : '🌐'}{' '}
                    {geoInfo[node.label].label}
                  </div>
                )}

                <div className="flex flex-wrap gap-1 mt-2">
                  {node.protocols.map(proto => (
                    <span
                      key={proto}
                      className="text-[10px] px-1.5 py-0.5 rounded-md font-mono uppercase"
                      style={{
                        backgroundColor: `${PROTOCOL_COLORS[proto.toLowerCase()] || '#64748b'}20`,
                        color: PROTOCOL_COLORS[proto.toLowerCase()] || '#94a3b8',
                        border: `1px solid ${PROTOCOL_COLORS[proto.toLowerCase()] || '#64748b'}40`
                      }}
                    >
                      {proto}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
                  <span>連線數</span>
                  <span className="font-mono text-slate-300">{node.connectionCount}</span>
                </div>
              </div>
            )
          })}
      </div>
    </div>
  )
}
