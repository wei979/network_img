import React, { useState } from 'react'
import { X, Network, Clock, Database, FileText, ChevronLeft, ChevronRight, AlertTriangle, Globe, ArrowRight } from 'lucide-react'
import { S } from '../lib/swiss-tokens'

/**
 * PacketViewer - 封包檢視器元件
 * 以梅花狀佈局顯示連線的封包詳細資訊
 */
export default function PacketViewer({ connectionData, onClose, loading }) {
  const [currentPage, setCurrentPage] = useState(0)
  const packetsPerPage = 5 // 梅花狀：中心 + 4 個方向

  if (loading) {
    return (
      <div
        className="fixed top-0 right-0 h-full w-[500px] flex items-center justify-center z-50"
        style={{
          background: `${S.bgRaised}f0`,
          borderLeft: `1px solid ${S.border}`,
        }}
      >
        <div style={{ color: S.text.secondary }}>載入封包資訊中...</div>
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
    <div
      className="fixed top-0 right-0 h-full w-[600px] z-50 flex flex-col"
      style={{
        background: `${S.bgRaised}f0`,
        borderLeft: `1px solid ${S.border}`,
      }}
    >
      {/* 標題列 */}
      <div className="flex items-center justify-between p-6" style={{ borderBottom: `1px solid ${S.border}` }}>
        <div className="flex items-center gap-3">
          <Database className="w-5 h-5" style={{ color: S.accent }} />
          <div>
            <h2 className="text-lg font-semibold" style={{ color: S.text.primary }}>封包檢視器</h2>
            <p className="text-xs mt-0.5" style={{ color: S.text.secondary }}>
              共 {total_packets} 個封包
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 transition-colors"
          style={{ borderRadius: S.radius.sm }}
          onMouseEnter={e => e.currentTarget.style.background = S.surfaceHover}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <X className="w-5 h-5" style={{ color: S.text.tertiary }} />
        </button>
      </div>

      {/* 連線資訊卡片（固定在頂部）*/}
      {connectionInfo && (
        <div className="p-6" style={{ borderBottom: `1px solid ${S.border}`, background: S.surface }}>
          <div className="flex items-center gap-2 mb-3">
            <Network className="w-4 h-4" style={{ color: S.protocol.HTTP }} />
            <span className="text-sm font-semibold" style={{ color: S.text.secondary }}>連線資訊</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span style={{ color: S.text.tertiary }}>協議</span>
              <div className="mt-1" style={{ color: S.text.primary, fontFamily: S.font.mono }}>{connectionInfo.protocol}</div>
            </div>
            <div>
              <span style={{ color: S.text.tertiary }}>來源</span>
              <div className="mt-1" style={{ color: S.text.primary, fontFamily: S.font.mono }}>
                {connectionInfo.srcIp}:{connectionInfo.srcPort}
              </div>
            </div>
            <div className="col-span-2">
              <span style={{ color: S.text.tertiary }}>目的地</span>
              <div className="mt-1" style={{ color: S.text.primary, fontFamily: S.font.mono }}>
                {connectionInfo.dstIp}:{connectionInfo.dstPort}
              </div>
            </div>
            {packets.length > 0 && packets[0].streamId && (
              <div className="col-span-2">
                <span style={{ color: S.text.tertiary }}>串流 ID</span>
                <div className="text-[11px] mt-1" style={{ color: S.accent, fontFamily: S.font.mono }}>
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
            className="p-4 transition-colors"
            style={{
              background: S.surface,
              borderRadius: S.radius.md,
              border: `1px solid ${S.border}`,
            }}
          >
            {/* 封包標題 */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ background: `${S.accent}20` }}
                >
                  <span className="text-xs font-bold" style={{ color: S.accent }}>
                    {startIndex + index + 1}
                  </span>
                </div>
                <span className="text-sm font-semibold" style={{ color: S.text.secondary }}>
                  封包 #{packet.index}
                </span>
                {packet.errorType && (
                  <div
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full"
                    style={{ background: `${S.protocol.ICMP}20`, border: `1px solid ${S.protocol.ICMP}30` }}
                  >
                    <AlertTriangle className="w-3 h-3" style={{ color: S.protocol.ICMP }} />
                    <span className="text-[10px] font-semibold" style={{ color: S.protocol.ICMP }}>
                      {packet.errorType}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs" style={{ color: S.text.tertiary }}>
                <Clock className="w-3 h-3" />
                {packet.relativeTime || '0.000s'}
              </div>
            </div>

            {/* 5-tuple */}
            <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
              <div className="rounded px-2 py-1.5" style={{ background: `${S.bg}80` }}>
                <span style={{ color: S.text.tertiary }}>來源</span>
                <div className="text-[11px] mt-0.5" style={{ color: S.text.primary, fontFamily: S.font.mono }}>
                  {packet.fiveTuple?.srcIp}:{packet.fiveTuple?.srcPort}
                </div>
              </div>
              <div className="rounded px-2 py-1.5" style={{ background: `${S.bg}80` }}>
                <span style={{ color: S.text.tertiary }}>目的</span>
                <div className="text-[11px] mt-0.5" style={{ color: S.text.primary, fontFamily: S.font.mono }}>
                  {packet.fiveTuple?.dstIp}:{packet.fiveTuple?.dstPort}
                </div>
              </div>
            </div>

            {/* Headers */}
            {packet.headers?.tcp && (
              <div className="mb-3">
                <div className="text-xs font-semibold mb-2" style={{ color: S.text.secondary }}>TCP Headers</div>
                <div className="rounded px-3 py-2 text-xs space-y-1" style={{ background: `${S.bg}80`, fontFamily: S.font.mono }}>
                  <div className="flex justify-between">
                    <span style={{ color: S.text.tertiary }}>Flags:</span>
                    <span style={{ color: S.protocol.HTTP }}>{packet.headers.tcp.flags}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: S.text.tertiary }}>Seq:</span>
                    <span style={{ color: S.text.secondary }}>{packet.headers.tcp.seq}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: S.text.tertiary }}>Ack:</span>
                    <span style={{ color: S.text.secondary }}>{packet.headers.tcp.ack}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: S.text.tertiary }}>Window:</span>
                    <span style={{ color: S.text.secondary }}>{packet.headers.tcp.window}</span>
                  </div>
                </div>
              </div>
            )}

            {packet.headers?.udp && (
              <div className="mb-3">
                <div className="text-xs font-semibold mb-2" style={{ color: S.text.secondary }}>UDP Headers</div>
                <div className="rounded px-3 py-2 text-xs space-y-1" style={{ background: `${S.bg}80`, fontFamily: S.font.mono }}>
                  <div className="flex justify-between">
                    <span style={{ color: S.text.tertiary }}>Length:</span>
                    <span style={{ color: S.text.secondary }}>{packet.headers.udp.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: S.text.tertiary }}>Checksum:</span>
                    <span style={{ color: S.text.secondary }}>{packet.headers.udp.checksum}</span>
                  </div>
                </div>
              </div>
            )}

            {/* HTTP Information */}
            {packet.http && (
              <div className="mb-3">
                <div className="flex items-center gap-2 text-xs font-semibold mb-2" style={{ color: S.text.secondary }}>
                  <Globe className="w-3 h-3" />
                  HTTP {packet.http.type === 'request' ? 'Request' : 'Response'}
                </div>
                <div
                  className="rounded px-3 py-2 text-xs space-y-2"
                  style={{ background: `${S.protocol.HTTP}0c`, border: `1px solid ${S.protocol.HTTP}30` }}
                >
                  {/* Request Line */}
                  {packet.http.type === 'request' && (
                    <div style={{ fontFamily: S.font.mono }}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold" style={{ color: S.protocol.HTTP }}>{packet.http.method}</span>
                        <ArrowRight className="w-3 h-3" style={{ color: S.text.tertiary }} />
                        <span style={{ color: S.text.primary }}>{packet.http.path}</span>
                      </div>
                      <div className="text-[10px]" style={{ color: S.text.tertiary }}>{packet.http.version}</div>
                    </div>
                  )}

                  {/* Response Line */}
                  {packet.http.type === 'response' && (
                    <div style={{ fontFamily: S.font.mono }}>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold" style={{
                          color: packet.http.status >= 200 && packet.http.status < 300 ? S.protocol.HTTP
                            : packet.http.status >= 400 ? S.protocol.ICMP
                            : '#eab308'
                        }}>
                          {packet.http.status}
                        </span>
                        <span style={{ color: S.text.primary }}>{packet.http.statusText}</span>
                      </div>
                      <div className="text-[10px] mt-1" style={{ color: S.text.tertiary }}>{packet.http.version}</div>
                    </div>
                  )}

                  {/* Headers */}
                  {packet.http.headers && Object.keys(packet.http.headers).length > 0 && (
                    <div className="pt-2" style={{ borderTop: `1px solid ${S.protocol.HTTP}20` }}>
                      <div className="text-[10px] mb-1" style={{ color: S.text.tertiary }}>Headers:</div>
                      <div className="space-y-0.5 text-[10px]" style={{ fontFamily: S.font.mono }}>
                        {Object.entries(packet.http.headers).slice(0, 5).map(([key, value]) => (
                          <div key={key} className="flex gap-2">
                            <span style={{ color: S.protocol.HTTP }}>{key}:</span>
                            <span className="truncate" style={{ color: S.text.secondary }}>{value}</span>
                          </div>
                        ))}
                        {Object.keys(packet.http.headers).length > 5 && (
                          <div className="italic" style={{ color: S.text.tertiary }}>
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
                <div className="flex items-center gap-2 text-xs font-semibold mb-2" style={{ color: S.text.secondary }}>
                  <FileText className="w-3 h-3" />
                  Payload ({packet.payload.length} bytes)
                </div>
                <div
                  className="rounded px-3 py-2 text-[10px] leading-relaxed max-h-32 overflow-y-auto"
                  style={{ background: `${S.bg}b0`, fontFamily: S.font.mono }}
                >
                  {formatPayloadPreview(packet.payload.preview, packet.payload.ascii).map((line, i) => (
                    <div key={i} className="flex gap-4">
                      <span style={{ color: S.accent }}>{line.hex}</span>
                      <span style={{ color: S.text.tertiary }}>{line.ascii}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!packet.payload?.preview && (
              <div className="text-xs italic" style={{ color: S.text.tertiary }}>無 Payload 資料</div>
            )}
          </div>
        ))}
      </div>

      {/* 分頁控制 */}
      {totalPages > 1 && (
        <div
          className="p-4 flex items-center justify-between"
          style={{ borderTop: `1px solid ${S.border}`, background: S.surface }}
        >
          <button
            onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
            className="flex items-center gap-1 px-3 py-2 text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              borderRadius: S.radius.sm,
              background: S.surfaceHover,
              color: S.text.secondary,
            }}
          >
            <ChevronLeft className="w-4 h-4" />
            上一頁
          </button>
          <span className="text-sm" style={{ color: S.text.secondary }}>
            第 {currentPage + 1} / {totalPages} 頁
          </span>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
            disabled={currentPage === totalPages - 1}
            className="flex items-center gap-1 px-3 py-2 text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              borderRadius: S.radius.sm,
              background: S.surfaceHover,
              color: S.text.secondary,
            }}
          >
            下一頁
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
