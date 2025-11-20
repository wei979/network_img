import React, { useState } from 'react'
import { X, Network, Clock, Database, FileText, ChevronLeft, ChevronRight, AlertTriangle, Globe, ArrowRight } from 'lucide-react'

/**
 * PacketViewer - 封包檢視器元件
 * 以梅花狀佈局顯示連線的封包詳細資訊
 */
export default function PacketViewer({ connectionData, onClose, loading }) {
  const [currentPage, setCurrentPage] = useState(0)
  const packetsPerPage = 5 // 梅花狀：中心 + 4 個方向

  if (loading) {
    return (
      <div className="fixed top-0 right-0 h-full w-[500px] bg-slate-900/95 backdrop-blur-xl border-l border-slate-700 shadow-2xl z-50 flex items-center justify-center">
        <div className="text-slate-400">載入封包資訊中...</div>
      </div>
    )
  }

  if (!connectionData) {
    return null
  }

  const { connection_id, total_packets, packets = [] } = connectionData

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

  const connectionInfo = parseConnectionId(connection_id)

  // 分頁邏輯
  const totalPages = Math.ceil(total_packets / packetsPerPage)
  const startIndex = currentPage * packetsPerPage
  const visiblePackets = packets.slice(startIndex, startIndex + packetsPerPage)

  // 梅花狀位置計算（中心 + 上下左右）
  const getPlumPosition = (index) => {
    const positions = [
      { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }, // 中心
      { top: '15%', left: '50%', transform: 'translate(-50%, -50%)' }, // 上
      { top: '85%', left: '50%', transform: 'translate(-50%, -50%)' }, // 下
      { top: '50%', left: '15%', transform: 'translate(-50%, -50%)' }, // 左
      { top: '50%', left: '85%', transform: 'translate(-50%, -50%)' }  // 右
    ]
    return positions[index % positions.length]
  }

  // 格式化 payload 為 hex dump
  const formatPayloadPreview = (preview, ascii) => {
    if (!preview) return '(無資料)'

    // 每 16 bytes 一行
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

  return (
    <div className="fixed top-0 right-0 h-full w-[600px] bg-slate-900/95 backdrop-blur-xl border-l border-slate-700 shadow-2xl z-50 flex flex-col">
      {/* 標題列 */}
      <div className="flex items-center justify-between p-6 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <Database className="w-5 h-5 text-cyan-400" />
          <div>
            <h2 className="text-lg font-semibold text-slate-200">封包檢視器</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              共 {total_packets} 個封包
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

      {/* 連線資訊卡片（固定在頂部）*/}
      {connectionInfo && (
        <div className="p-6 border-b border-slate-700 bg-slate-800/50">
          <div className="flex items-center gap-2 mb-3">
            <Network className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-semibold text-slate-300">連線資訊</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-500">協議</span>
              <div className="text-slate-200 font-mono mt-1">{connectionInfo.protocol}</div>
            </div>
            <div>
              <span className="text-slate-500">來源</span>
              <div className="text-slate-200 font-mono mt-1">
                {connectionInfo.srcIp}:{connectionInfo.srcPort}
              </div>
            </div>
            <div className="col-span-2">
              <span className="text-slate-500">目的地</span>
              <div className="text-slate-200 font-mono mt-1">
                {connectionInfo.dstIp}:{connectionInfo.dstPort}
              </div>
            </div>
            {packets.length > 0 && packets[0].streamId && (
              <div className="col-span-2">
                <span className="text-slate-500">串流 ID</span>
                <div className="text-cyan-400 font-mono mt-1 text-[11px]">
                  {packets[0].streamId}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 封包卡片滾動區域 */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {visiblePackets.map((packet, index) => (
          <div
            key={packet.index}
            className="bg-slate-800/70 rounded-lg p-4 border border-slate-700 hover:border-cyan-500/50 transition-colors"
          >
            {/* 封包標題 */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center">
                  <span className="text-xs font-bold text-cyan-400">
                    {startIndex + index + 1}
                  </span>
                </div>
                <span className="text-sm font-semibold text-slate-300">
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

            {/* 5-tuple */}
            <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
              <div className="bg-slate-900/50 rounded px-2 py-1.5">
                <span className="text-slate-500">來源</span>
                <div className="text-slate-200 font-mono text-[11px] mt-0.5">
                  {packet.fiveTuple?.srcIp}:{packet.fiveTuple?.srcPort}
                </div>
              </div>
              <div className="bg-slate-900/50 rounded px-2 py-1.5">
                <span className="text-slate-500">目的</span>
                <div className="text-slate-200 font-mono text-[11px] mt-0.5">
                  {packet.fiveTuple?.dstIp}:{packet.fiveTuple?.dstPort}
                </div>
              </div>
            </div>

            {/* Headers */}
            {packet.headers?.tcp && (
              <div className="mb-3">
                <div className="text-xs font-semibold text-slate-400 mb-2">TCP Headers</div>
                <div className="bg-slate-900/50 rounded px-3 py-2 text-xs font-mono space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Flags:</span>
                    <span className="text-emerald-400">{packet.headers.tcp.flags}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Seq:</span>
                    <span className="text-slate-300">{packet.headers.tcp.seq}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Ack:</span>
                    <span className="text-slate-300">{packet.headers.tcp.ack}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Window:</span>
                    <span className="text-slate-300">{packet.headers.tcp.window}</span>
                  </div>
                </div>
              </div>
            )}

            {packet.headers?.udp && (
              <div className="mb-3">
                <div className="text-xs font-semibold text-slate-400 mb-2">UDP Headers</div>
                <div className="bg-slate-900/50 rounded px-3 py-2 text-xs font-mono space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Length:</span>
                    <span className="text-slate-300">{packet.headers.udp.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Checksum:</span>
                    <span className="text-slate-300">{packet.headers.udp.checksum}</span>
                  </div>
                </div>
              </div>
            )}

            {/* HTTP Information */}
            {packet.http && (
              <div className="mb-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-2">
                  <Globe className="w-3 h-3" />
                  HTTP {packet.http.type === 'request' ? 'Request' : 'Response'}
                </div>
                <div className="bg-emerald-900/20 border border-emerald-500/30 rounded px-3 py-2 text-xs space-y-2">
                  {/* Request Line */}
                  {packet.http.type === 'request' && (
                    <div className="font-mono">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-emerald-400 font-semibold">{packet.http.method}</span>
                        <ArrowRight className="w-3 h-3 text-slate-500" />
                        <span className="text-slate-200">{packet.http.path}</span>
                      </div>
                      <div className="text-slate-400 text-[10px]">{packet.http.version}</div>
                    </div>
                  )}

                  {/* Response Line */}
                  {packet.http.type === 'response' && (
                    <div className="font-mono">
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold ${
                          packet.http.status >= 200 && packet.http.status < 300 ? 'text-emerald-400' :
                          packet.http.status >= 400 ? 'text-red-400' : 'text-yellow-400'
                        }`}>
                          {packet.http.status}
                        </span>
                        <span className="text-slate-200">{packet.http.statusText}</span>
                      </div>
                      <div className="text-slate-400 text-[10px] mt-1">{packet.http.version}</div>
                    </div>
                  )}

                  {/* Headers */}
                  {packet.http.headers && Object.keys(packet.http.headers).length > 0 && (
                    <div className="border-t border-emerald-500/20 pt-2">
                      <div className="text-[10px] text-slate-500 mb-1">Headers:</div>
                      <div className="space-y-0.5 font-mono text-[10px]">
                        {Object.entries(packet.http.headers).slice(0, 5).map(([key, value]) => (
                          <div key={key} className="flex gap-2">
                            <span className="text-emerald-400">{key}:</span>
                            <span className="text-slate-300 truncate">{value}</span>
                          </div>
                        ))}
                        {Object.keys(packet.http.headers).length > 5 && (
                          <div className="text-slate-500 italic">
                            +{Object.keys(packet.http.headers).length - 5} more...
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Payload */}
            {packet.payload?.preview && (
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-2">
                  <FileText className="w-3 h-3" />
                  Payload ({packet.payload.length} bytes)
                </div>
                <div className="bg-slate-900/70 rounded px-3 py-2 font-mono text-[10px] leading-relaxed max-h-32 overflow-y-auto">
                  {formatPayloadPreview(packet.payload.preview, packet.payload.ascii).map((line, i) => (
                    <div key={i} className="flex gap-4">
                      <span className="text-cyan-400">{line.hex}</span>
                      <span className="text-slate-500">{line.ascii}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!packet.payload?.preview && (
              <div className="text-xs text-slate-500 italic">無 Payload 資料</div>
            )}
          </div>
        ))}
      </div>

      {/* 分頁控制 */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-slate-700 flex items-center justify-between bg-slate-800/50">
          <button
            onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
            className="flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm"
          >
            <ChevronLeft className="w-4 h-4" />
            上一頁
          </button>
          <span className="text-sm text-slate-400">
            第 {currentPage + 1} / {totalPages} 頁
          </span>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
            disabled={currentPage === totalPages - 1}
            className="flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm"
          >
            下一頁
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
