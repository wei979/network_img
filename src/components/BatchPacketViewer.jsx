import React, { useState, useEffect, useRef } from 'react'
import { X, Database, Clock, AlertTriangle, ChevronDown, ChevronUp, Loader, Network, BarChart3 } from 'lucide-react'
import AttackTimelineChart from './AttackTimelineChart'

/**
 * BatchPacketViewer - 批量封包檢視器
 * 用於顯示多條連線的封包資訊（如 SYN Flood 攻擊的 1536 條連線）
 *
 * 方案 E（混合模式）：
 * 1. 上方：攻擊時間軸統計圖
 * 2. 下方：封包列表（分批載入）
 *
 * 防護機制：
 * 1. 分批載入：每次只載入 10 條連線的封包
 * 2. 數量限制：每條連線只載入前 20 個封包
 * 3. 虛擬滾動：只渲染可見範圍的內容
 */
export default function BatchPacketViewer({ aggregatedConnection, onClose }) {
  const [activeTab, setActiveTab] = useState('timeline') // 'timeline' | 'packets'
  const [batchData, setBatchData] = useState({})
  const [loading, setLoading] = useState(false)
  const [loadedCount, setLoadedCount] = useState(0)
  const [error, setError] = useState(null)
  const [expandedConnections, setExpandedConnections] = useState(new Set())

  const scrollContainerRef = useRef(null)

  // 配置
  const BATCH_SIZE = 10
  const PACKETS_PER_CONNECTION = 20
  const MAX_TOTAL_CONNECTIONS = 100

  const connectionIds = aggregatedConnection?.connections?.map(c => c.originalId) || []
  const totalConnections = Math.min(connectionIds.length, MAX_TOTAL_CONNECTIONS)
  const hasMore = loadedCount < totalConnections

  // 載入一批連線的封包資訊
  const loadBatch = async () => {
    if (loading || !hasMore) return

    setLoading(true)
    setError(null)

    const start = loadedCount
    const end = Math.min(start + BATCH_SIZE, totalConnections)
    const batchIds = connectionIds.slice(start, end)

    console.log(`[BatchPacketViewer] Loading batch ${start}-${end} of ${totalConnections}`)

    try {
      const response = await fetch('/api/packets/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          connection_ids: batchIds,
          packets_per_connection: PACKETS_PER_CONNECTION
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      console.log(`[BatchPacketViewer] Loaded ${Object.keys(data.results).length} connections`)

      setBatchData(prev => ({ ...prev, ...data.results }))
      setLoadedCount(end)
    } catch (err) {
      console.error('[BatchPacketViewer] Failed to load batch:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // 初始載入第一批
  useEffect(() => {
    if (connectionIds.length > 0 && loadedCount === 0) {
      loadBatch()
    }
  }, [connectionIds])

  // 切換連線展開/收起
  const toggleConnection = (connId) => {
    setExpandedConnections(prev => {
      const next = new Set(prev)
      if (next.has(connId)) {
        next.delete(connId)
      } else {
        next.add(connId)
      }
      return next
    })
  }

  // 解析 connection ID
  const parseConnectionId = (id) => {
    const parts = id.split('-')
    if (parts.length >= 5) {
      return {
        protocol: parts[0].toUpperCase(),
        srcIp: parts[1],
        srcPort: parts[2],
        dstIp: parts[3],
        dstPort: parts[4]
      }
    }
    return null
  }

  // 格式化 payload 為 hex dump
  const formatPayloadPreview = (preview, ascii) => {
    if (!preview) return []

    const bytes = preview.match(/.{1,2}/g) || []
    const lines = []
    for (let i = 0; i < Math.min(bytes.length, 32); i += 16) {
      const lineBytes = bytes.slice(i, i + 16)
      const hex = lineBytes.join(' ')
      const asciiPart = ascii ? ascii.slice(i / 2, (i + 16) / 2) : ''
      lines.push({ hex, ascii: asciiPart })
    }
    return lines
  }

  // 渲染單一連線卡片
  const renderConnectionCard = (connId, index) => {
    const connData = batchData[connId]
    const isExpanded = expandedConnections.has(connId)
    const connInfo = parseConnectionId(connId)

    if (!connData) {
      return (
        <div key={connId} className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
          <div className="flex items-center gap-2 text-slate-400">
            <Loader className="w-4 h-4 animate-spin" />
            <span className="text-sm">載入中...</span>
          </div>
        </div>
      )
    }

    if (connData.error) {
      return (
        <div key={connId} className="bg-red-900/20 rounded-lg p-4 border border-red-500/30">
          <div className="flex items-center gap-2 text-red-400">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm">{connData.error}</span>
          </div>
        </div>
      )
    }

    return (
      <div key={connId} className="bg-slate-800/70 rounded-lg border border-slate-700 overflow-hidden">
        {/* 連線標題 */}
        <button
          onClick={() => toggleConnection(connId)}
          className="w-full p-4 flex items-center justify-between hover:bg-slate-700/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center">
              <span className="text-xs font-bold text-cyan-400">{index + 1}</span>
            </div>
            <div className="text-left">
              <div className="text-sm font-semibold text-slate-200">
                {connInfo?.protocol || 'UNKNOWN'}
              </div>
              <div className="text-xs text-slate-400 font-mono mt-0.5">
                {connInfo?.srcIp}:{connInfo?.srcPort} → {connInfo?.dstIp}:{connInfo?.dstPort}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs text-slate-400">
              {connData.returned_packets} / {connData.total_packets} 封包
            </div>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </div>
        </button>

        {/* 封包列表（展開時顯示）*/}
        {isExpanded && connData.packets && (
          <div className="border-t border-slate-700 p-4 space-y-3 max-h-96 overflow-y-auto bg-slate-900/50">
            {connData.packets.map((packet, pIndex) => (
              <div key={pIndex} className="bg-slate-800/70 rounded-lg p-3 border border-slate-700">
                {/* 封包標題 */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-300">
                      封包 #{packet.index}
                    </span>
                    {packet.errorType && (
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/30">
                        <AlertTriangle className="w-3 h-3 text-red-400" />
                        <span className="text-[10px] font-semibold text-red-400">
                          {packet.errorType}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Clock className="w-3 h-3" />
                    {packet.relativeTime || '0.000s'}
                  </div>
                </div>

                {/* TCP Headers */}
                {packet.headers?.tcp && (
                  <div className="mb-2">
                    <div className="text-xs font-semibold text-slate-400 mb-1">TCP</div>
                    <div className="bg-slate-900/50 rounded px-2 py-1.5 text-xs font-mono space-y-0.5">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Flags:</span>
                        <span className="text-emerald-400">{packet.headers.tcp.flags}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Seq:</span>
                        <span className="text-slate-300">{packet.headers.tcp.seq}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* UDP Headers */}
                {packet.headers?.udp && (
                  <div className="mb-2">
                    <div className="text-xs font-semibold text-slate-400 mb-1">UDP</div>
                    <div className="bg-slate-900/50 rounded px-2 py-1.5 text-xs font-mono">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Length:</span>
                        <span className="text-slate-300">{packet.headers.udp.length}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Payload */}
                {packet.payload?.preview && (
                  <div>
                    <div className="text-xs font-semibold text-slate-400 mb-1">
                      Payload ({packet.payload.length} bytes)
                    </div>
                    <div className="bg-slate-900/70 rounded px-2 py-1.5 font-mono text-[10px] leading-relaxed max-h-24 overflow-y-auto">
                      {formatPayloadPreview(packet.payload.preview, packet.payload.ascii).map((line, i) => (
                        <div key={i} className="flex gap-3">
                          <span className="text-cyan-400">{line.hex}</span>
                          <span className="text-slate-500">{line.ascii}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {connData.total_packets > connData.returned_packets && (
              <div className="text-xs text-slate-500 italic text-center py-2">
                還有 {connData.total_packets - connData.returned_packets} 個封包未顯示
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="fixed top-0 right-0 h-full w-[700px] bg-slate-900/95 backdrop-blur-xl border-l border-slate-700 shadow-2xl z-50 flex flex-col">
      {/* 標題列 */}
      <div className="flex items-center justify-between p-6 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <Database className="w-5 h-5 text-cyan-400" />
          <div>
            <h2 className="text-lg font-semibold text-slate-200">批量封包檢視器</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              已載入 {loadedCount} / {totalConnections} 條連線
              {totalConnections < connectionIds.length && (
                <span className="text-orange-400 ml-2">
                  （已限制最多 {MAX_TOTAL_CONNECTIONS} 條）
                </span>
              )}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-slate-400" />
        </button>
      </div>

      {/* 聚合連線資訊 */}
      <div className="p-4 border-b border-slate-700 bg-slate-800/50">
        <div className="flex items-center gap-2 mb-2">
          <Network className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-semibold text-slate-300">聚合連線資訊</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-slate-500">來源 IP</span>
            <div className="text-slate-200 font-mono">{aggregatedConnection?.src}</div>
          </div>
          <div>
            <span className="text-slate-500">目的 IP</span>
            <div className="text-slate-200 font-mono">{aggregatedConnection?.dst}</div>
          </div>
          <div>
            <span className="text-slate-500">連線數量</span>
            <div className="text-cyan-400 font-mono">{aggregatedConnection?.connectionCount} 條</div>
          </div>
          <div>
            <span className="text-slate-500">協議類型</span>
            <div className="text-slate-200 font-mono">
              {aggregatedConnection?.protocols?.join(', ') || 'N/A'}
            </div>
          </div>
        </div>
      </div>

      {/* Tab 切換 */}
      <div className="flex border-b border-slate-700">
        <button
          onClick={() => setActiveTab('timeline')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'timeline'
              ? 'text-cyan-400 border-b-2 border-cyan-400 bg-slate-800/50'
              : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/30'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          攻擊時間軸
        </button>
        <button
          onClick={() => setActiveTab('packets')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'packets'
              ? 'text-cyan-400 border-b-2 border-cyan-400 bg-slate-800/50'
              : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/30'
          }`}
        >
          <Database className="w-4 h-4" />
          封包列表
          <span className="text-xs text-slate-500">({loadedCount}/{totalConnections})</span>
        </button>
      </div>

      {/* Tab 內容 */}
      <div className="flex-1 overflow-hidden">
        {/* 攻擊時間軸 Tab */}
        {activeTab === 'timeline' && (
          <div className="h-full overflow-y-auto p-4">
            <AttackTimelineChart
              aggregatedConnection={aggregatedConnection}
              onTimePointClick={(point) => {
                console.log('[BatchPacketViewer] Time point clicked:', point)
                setActiveTab('packets')
              }}
            />

            {/* 說明 */}
            <div className="mt-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
              <h4 className="text-sm font-semibold text-slate-300 mb-2">視覺化說明</h4>
              <ul className="text-xs text-slate-400 space-y-1">
                <li>• 紅色區域代表封包密度，越高表示攻擊越激烈</li>
                <li>• SYN 比例越高，越可能是 SYN Flood 攻擊</li>
                <li>• 點擊時間軸上的時間點可以查看該時段的封包詳情</li>
                <li>• 切換到「封包列表」標籤可查看個別連線的封包內容</li>
              </ul>
            </div>
          </div>
        )}

        {/* 封包列表 Tab */}
        {activeTab === 'packets' && (
          <div ref={scrollContainerRef} className="h-full overflow-y-auto p-4 space-y-3">
            {connectionIds.slice(0, loadedCount).map((connId, index) => renderConnectionCard(connId, index))}

            {/* 載入更多按鈕 */}
            {hasMore && (
              <div className="flex justify-center pt-4">
                <button
                  onClick={loadBatch}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      載入中...
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4" />
                      載入更多 ({loadedCount} / {totalConnections})
                    </>
                  )}
                </button>
              </div>
            )}

            {/* 錯誤訊息 */}
            {error && (
              <div className="bg-red-900/20 rounded-lg p-4 border border-red-500/30">
                <div className="flex items-center gap-2 text-red-400">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm">載入失敗：{error}</span>
                </div>
              </div>
            )}

            {/* 全部載入完成 */}
            {!hasMore && loadedCount > 0 && (
              <div className="text-center py-4 text-slate-400 text-sm">
                已載入全部 {loadedCount} 條連線
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
