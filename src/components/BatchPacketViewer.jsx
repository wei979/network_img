import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { X, Database, Clock, AlertTriangle, ChevronDown, ChevronUp, Loader, Network, BarChart3, CheckCircle, Circle, AlertCircle } from 'lucide-react'
import { S } from '../lib/swiss-tokens'
import { buildPacketStageMap, groupPacketsByStage } from '../lib/protocolStageMapper'
import AttackTimelineChart from './AttackTimelineChart'
import PacketInspector from './PacketInspector'

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
export default function BatchPacketViewer({
  aggregatedConnection,
  onClose,
  playbackProgress = 0,
  onStatisticsLoaded = null,
  isAttackTraffic = true,
  activeParticleIndices = new Set(),
  selectedPacketIndex = null,
  onPacketSelect = null,
  preloadedPackets = null
}) {
  const [activeTab, setActiveTab] = useState(isAttackTraffic ? 'timeline' : 'packets')

  useEffect(() => {
    setActiveTab(isAttackTraffic ? 'timeline' : 'packets')
  }, [isAttackTraffic])

  const [batchData, setBatchData] = useState({})
  const [loading, setLoading] = useState(false)
  const [loadedCount, setLoadedCount] = useState(0)
  const [error, setError] = useState(null)
  const [expandedConnections, setExpandedConnections] = useState(new Set())

  const [inspectedPacket, setInspectedPacket] = useState(null)
  const [inspectLoading, setInspectLoading] = useState(false)

  const scrollContainerRef = useRef(null)
  const packetRefsMap = useRef(new Map())

  const fetchPacketDetail = useCallback(async (connectionId, packetIndex) => {
    setInspectLoading(true)
    try {
      const resp = await fetch(`/api/packet-detail/${encodeURIComponent(connectionId)}/${packetIndex}`, {
        credentials: 'include'
      })
      if (!resp.ok) {
        console.warn(`[BatchPacketViewer] Failed to fetch packet detail: ${resp.status}`)
        setInspectedPacket(null)
        return
      }
      const data = await resp.json()
      setInspectedPacket(data.packet_detail)
    } catch (err) {
      console.warn('[BatchPacketViewer] Packet detail fetch error:', err)
      setInspectedPacket(null)
    } finally {
      setInspectLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedPacketIndex === null) {
      setInspectedPacket(null)
      return
    }
    let connId = null
    if (preloadedPackets?.connectionId) {
      connId = preloadedPackets.connectionId
    } else {
      for (const [cid, cdata] of Object.entries(batchData)) {
        if (cdata.packets?.some(p => p.index === selectedPacketIndex)) {
          connId = cid
          break
        }
      }
    }
    if (connId) {
      fetchPacketDetail(connId, selectedPacketIndex)
    }
  }, [selectedPacketIndex, batchData, preloadedPackets, fetchPacketDetail])

  useEffect(() => {
    if (selectedPacketIndex === null) return

    if (preloadedPackets?.packets?.length > 0) {
      setActiveTab('packets')
      setTimeout(() => {
        const packetEl = packetRefsMap.current.get(selectedPacketIndex)
        if (packetEl) {
          packetEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 100)
      return
    }

    let targetConnId = null
    for (const [connId, connData] of Object.entries(batchData)) {
      if (connData.packets?.some(p => p.index === selectedPacketIndex)) {
        targetConnId = connId
        break
      }
    }

    if (targetConnId) {
      setActiveTab('packets')
      setExpandedConnections(prev => new Set([...prev, targetConnId]))

      setTimeout(() => {
        const packetEl = packetRefsMap.current.get(selectedPacketIndex)
        if (packetEl) {
          packetEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 100)
    }
  }, [selectedPacketIndex, batchData, preloadedPackets])

  const lastActiveIndicesRef = useRef(new Set())
  useEffect(() => {
    if (!preloadedPackets?.packets?.length || activeTab !== 'packets') return

    const newActiveIndices = [...activeParticleIndices].filter(
      idx => !lastActiveIndicesRef.current.has(idx)
    )

    if (newActiveIndices.length > 0 && selectedPacketIndex === null) {
      const firstNewActive = Math.min(...newActiveIndices)
      const packetEl = packetRefsMap.current.get(firstNewActive)
      if (packetEl) {
        packetEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
    }

    lastActiveIndicesRef.current = new Set(activeParticleIndices)
  }, [activeParticleIndices, preloadedPackets, activeTab, selectedPacketIndex])

  const BATCH_SIZE = 10
  const PACKETS_PER_CONNECTION = 20
  const MAX_TOTAL_CONNECTIONS = 100

  const connectionIds = aggregatedConnection?.connections?.map(c => c.originalId) || []
  const totalConnections = Math.min(connectionIds.length, MAX_TOTAL_CONNECTIONS)
  const hasMore = loadedCount < totalConnections

  const loadBatch = async () => {
    if (loading || !hasMore) return

    setLoading(true)
    setError(null)

    const start = loadedCount
    const end = Math.min(start + BATCH_SIZE, totalConnections)
    const batchIds = connectionIds.slice(start, end)

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
      setBatchData(prev => ({ ...prev, ...data.results }))
      setLoadedCount(end)
    } catch (err) {
      console.error('[BatchPacketViewer] Failed to load batch:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (connectionIds.length > 0 && loadedCount === 0) {
      loadBatch()
    }
  }, [connectionIds])

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

  // Helper: get highlight style for packet card
  const getHighlightStyle = (isSelected, isActive) => {
    if (isSelected) return { background: `${S.accent}25`, border: `1px solid ${S.accent}` }
    if (isActive) return { background: `${S.accent}12`, border: `1px solid ${S.accent}60` }
    return { background: S.surface, border: `1px solid ${S.border}` }
  }

  // Helper: get flag badge style
  const getFlagBadgeStyle = (flags) => {
    if (flags.includes('URG') || flags.includes('PSH')) {
      return { background: `${S.protocol.ICMP}20`, color: S.protocol.ICMP, border: `1px solid ${S.protocol.ICMP}40` }
    }
    if (flags.includes('SYN')) {
      return { background: `${S.protocol.HTTP}20`, color: S.protocol.HTTP, border: `1px solid ${S.protocol.HTTP}40` }
    }
    return { background: S.surfaceHover, color: S.text.primary, border: 'none' }
  }

  const renderConnectionCard = (connId, index) => {
    const connData = batchData[connId]
    const isExpanded = expandedConnections.has(connId)
    const connInfo = parseConnectionId(connId)

    if (!connData) {
      return (
        <div key={connId} style={{ background: S.surface, borderRadius: S.radius.sm, padding: 16, border: `1px solid ${S.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: S.text.secondary }}>
            <Loader className="w-4 h-4 animate-spin" />
            <span style={{ fontSize: '0.875rem' }}>載入中...</span>
          </div>
        </div>
      )
    }

    if (connData.error) {
      return (
        <div key={connId} style={{ background: `${S.protocol.ICMP}10`, borderRadius: S.radius.sm, padding: 16, border: `1px solid ${S.protocol.ICMP}30` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: S.protocol.ICMP }}>
            <AlertTriangle className="w-4 h-4" />
            <span style={{ fontSize: '0.875rem' }}>{connData.error}</span>
          </div>
        </div>
      )
    }

    return (
      <div key={connId} style={{ background: S.surface, borderRadius: S.radius.sm, border: `1px solid ${S.border}`, overflow: 'hidden' }}>
        {/* 連線標題 */}
        <button
          onClick={() => toggleConnection(connId)}
          style={{
            width: '100%', padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'transparent', border: 'none', cursor: 'pointer', color: S.text.primary,
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = S.surfaceHover}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: `${S.accent}20`, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: S.accent }}>{index + 1}</span>
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: S.text.primary }}>
                {connInfo?.protocol || 'UNKNOWN'}
              </div>
              <div style={{ fontSize: '0.75rem', color: S.text.secondary, fontFamily: S.font.mono, marginTop: 2 }}>
                {connInfo?.srcIp}:{connInfo?.srcPort} → {connInfo?.dstIp}:{connInfo?.dstPort}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: '0.75rem', color: S.text.secondary }}>
              {connData.returned_packets} / {connData.total_packets} 封包
            </div>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" style={{ color: S.text.secondary }} />
            ) : (
              <ChevronDown className="w-4 h-4" style={{ color: S.text.secondary }} />
            )}
          </div>
        </button>

        {/* 封包列表（展開時顯示）*/}
        {isExpanded && connData.packets && (
          <div style={{ borderTop: `1px solid ${S.border}`, padding: 16, display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 384, overflowY: 'auto', background: S.bgRaised }}>
            {connData.packets.map((packet, pIndex) => {
              const isActive = activeParticleIndices.has(packet.index)
              const isSelected = selectedPacketIndex === packet.index
              const hl = getHighlightStyle(isSelected, isActive)

              return (
              <div
                key={pIndex}
                ref={el => {
                  if (el) packetRefsMap.current.set(packet.index, el)
                }}
                data-packet-index={packet.index}
                style={{ borderRadius: S.radius.sm, padding: 12, cursor: 'pointer', ...hl }}
                onClick={() => onPacketSelect?.(packet.index)}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: isSelected ? S.accent : isActive ? S.accent : S.text.primary }}>
                      封包 #{packet.index}
                    </span>
                    {packet.errorType && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: S.radius.sm, background: `${S.protocol.ICMP}20`, border: `1px solid ${S.protocol.ICMP}40` }}>
                        <AlertTriangle className="w-3 h-3" style={{ color: S.protocol.ICMP }} />
                        <span style={{ fontSize: '0.625rem', fontWeight: 600, color: S.protocol.ICMP }}>
                          {packet.errorType}
                        </span>
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: S.text.secondary }}>
                    <Clock className="w-3 h-3" />
                    {packet.relativeTime || '0.000s'}
                  </div>
                </div>

                {/* TCP Headers */}
                {packet.headers?.tcp && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: S.text.secondary, marginBottom: 4 }}>TCP</div>
                    <div style={{ background: S.bgRaised, borderRadius: S.radius.sm, padding: '6px 8px', fontSize: '0.75rem', fontFamily: S.font.mono }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: S.text.tertiary }}>Flags:</span>
                        <span style={{ color: S.protocol.HTTP }}>{packet.headers.tcp.flags}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: S.text.tertiary }}>Seq:</span>
                        <span style={{ color: S.text.primary }}>{packet.headers.tcp.seq}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* UDP Headers */}
                {packet.headers?.udp && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: S.text.secondary, marginBottom: 4 }}>UDP</div>
                    <div style={{ background: S.bgRaised, borderRadius: S.radius.sm, padding: '6px 8px', fontSize: '0.75rem', fontFamily: S.font.mono }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: S.text.tertiary }}>Length:</span>
                        <span style={{ color: S.text.primary }}>{packet.headers.udp.length}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Payload */}
                {packet.payload?.preview && (
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: S.text.secondary, marginBottom: 4 }}>
                      Payload ({packet.payload.length} bytes)
                    </div>
                    <div style={{ background: S.bg, borderRadius: S.radius.sm, padding: '6px 8px', fontFamily: S.font.mono, fontSize: '0.625rem', lineHeight: 1.6, maxHeight: 96, overflowY: 'auto' }}>
                      {formatPayloadPreview(packet.payload.preview, packet.payload.ascii).map((line, i) => (
                        <div key={i} style={{ display: 'flex', gap: 12 }}>
                          <span style={{ color: S.accent }}>{line.hex}</span>
                          <span style={{ color: S.text.tertiary }}>{line.ascii}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              );
            })}

            {connData.total_packets > connData.returned_packets && (
              <div style={{ fontSize: '0.75rem', color: S.text.tertiary, fontStyle: 'italic', textAlign: 'center', padding: '8px 0' }}>
                還有 {connData.total_packets - connData.returned_packets} 個封包未顯示
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, height: '100%', width: 700,
      background: S.bg, borderLeft: `1px solid ${S.border}`,
      zIndex: 50, display: 'flex', flexDirection: 'column',
      fontFamily: S.font.sans,
    }}>
      {/* 標題列 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 24, borderBottom: `1px solid ${S.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Database className="w-5 h-5" style={{ color: S.accent }} />
          <div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: S.text.primary, margin: 0 }}>批量封包檢視器</h2>
            <p style={{ fontSize: '0.75rem', color: S.text.secondary, marginTop: 2 }}>
              {preloadedPackets?.packets?.length > 0 ? (
                <>
                  <span style={{ color: S.accent }}>{preloadedPackets.packets.length}</span> 封包（動畫同步模式）
                  {activeParticleIndices.size > 0 && (
                    <span style={{ color: S.protocol.HTTP, marginLeft: 8 }}>
                      • {activeParticleIndices.size} 個活躍
                    </span>
                  )}
                </>
              ) : (
                <>
                  已載入 {loadedCount} / {totalConnections} 條連線
                  {totalConnections < connectionIds.length && (
                    <span style={{ color: S.accent, marginLeft: 8 }}>
                      （已限制最多 {MAX_TOTAL_CONNECTIONS} 條）
                    </span>
                  )}
                </>
              )}
            </p>
          </div>
        </div>
        <button
          aria-label="Close packet viewer"
          onClick={onClose}
          style={{ padding: 8, background: 'transparent', border: 'none', borderRadius: S.radius.sm, cursor: 'pointer', color: S.text.secondary }}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 聚合連線資訊 */}
      <div style={{ padding: 16, borderBottom: `1px solid ${S.border}`, background: S.surface }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Network className="w-4 h-4" style={{ color: S.protocol.HTTP }} />
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: S.text.primary }}>聚合連線資訊</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: '0.75rem' }}>
          <div>
            <span style={{ color: S.text.tertiary }}>來源 IP</span>
            <div style={{ color: S.text.primary, fontFamily: S.font.mono }}>{aggregatedConnection?.src}</div>
          </div>
          <div>
            <span style={{ color: S.text.tertiary }}>目的 IP</span>
            <div style={{ color: S.text.primary, fontFamily: S.font.mono }}>{aggregatedConnection?.dst}</div>
          </div>
          <div>
            <span style={{ color: S.text.tertiary }}>連線數量</span>
            <div style={{ color: S.accent, fontFamily: S.font.mono }}>{aggregatedConnection?.connectionCount} 條</div>
          </div>
          <div>
            <span style={{ color: S.text.tertiary }}>協議類型</span>
            <div style={{ color: S.text.primary, fontFamily: S.font.mono }}>
              {aggregatedConnection?.protocols?.join(', ') || 'N/A'}
            </div>
          </div>
        </div>
      </div>

      {/* Tab 切換 — underline style */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${S.border}` }}>
        <button
          onClick={() => setActiveTab('timeline')}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '12px 16px', fontSize: '0.875rem', fontWeight: 500,
            background: 'transparent', border: 'none', cursor: 'pointer',
            borderBottom: activeTab === 'timeline' ? `2px solid ${S.accent}` : '2px solid transparent',
            color: activeTab === 'timeline' ? S.accent : S.text.secondary,
          }}
        >
          <BarChart3 className="w-4 h-4" />
          攻擊時間軸
        </button>
        <button
          onClick={() => setActiveTab('packets')}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '12px 16px', fontSize: '0.875rem', fontWeight: 500,
            background: 'transparent', border: 'none', cursor: 'pointer',
            borderBottom: activeTab === 'packets' ? `2px solid ${S.accent}` : '2px solid transparent',
            color: activeTab === 'packets' ? S.accent : S.text.secondary,
          }}
        >
          <Database className="w-4 h-4" />
          封包列表
          <span style={{ fontSize: '0.75rem', color: S.text.tertiary }}>
            {preloadedPackets?.packets?.length > 0
              ? `(${preloadedPackets.packets.length})`
              : `(${loadedCount}/${totalConnections})`
            }
          </span>
        </button>
      </div>

      {/* Tab 內容 */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {/* 攻擊時間軸 Tab */}
        {activeTab === 'timeline' && (
          <div style={{ height: '100%', overflowY: 'auto', padding: 16 }}>
            <AttackTimelineChart
              aggregatedConnection={aggregatedConnection}
              playbackProgress={playbackProgress}
              onStatisticsLoaded={onStatisticsLoaded}
              onTimePointClick={(point) => {
                setActiveTab('packets')
              }}
            />

            {/* 說明 */}
            <div style={{ marginTop: 16, padding: 16, background: S.surface, borderRadius: S.radius.sm, border: `1px solid ${S.border}` }}>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: S.text.primary, marginBottom: 8 }}>視覺化說明</h4>
              <ul style={{ fontSize: '0.75rem', color: S.text.secondary, listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
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
          <div ref={scrollContainerRef} style={{ height: '100%', overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* 預載入封包模式 — 協議階段分組 */}
            {preloadedPackets?.packets?.length > 0 ? (
              <PreloadedPacketList
                preloadedPackets={preloadedPackets}
                aggregatedConnection={aggregatedConnection}
                activeParticleIndices={activeParticleIndices}
                selectedPacketIndex={selectedPacketIndex}
                onPacketSelect={onPacketSelect}
                packetRefsMap={packetRefsMap}
                getHighlightStyle={getHighlightStyle}
                getFlagBadgeStyle={getFlagBadgeStyle}
                inspectLoading={inspectLoading}
                inspectedPacket={inspectedPacket}
                setInspectedPacket={setInspectedPacket}
              />
            ) : (
              connectionIds.slice(0, loadedCount).map((connId, index) => renderConnectionCard(connId, index))
            )}

            {/* 載入更多按鈕 */}
            {!preloadedPackets?.packets?.length && hasMore && (
              <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 16 }}>
                <button
                  onClick={loadBatch}
                  disabled={loading}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 16px', borderRadius: S.radius.sm,
                    background: `${S.accent}20`, border: `1px solid ${S.accent}40`,
                    color: S.accent, cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.5 : 1,
                  }}
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
            {!preloadedPackets?.packets?.length && error && (
              <div style={{ background: `${S.protocol.ICMP}10`, borderRadius: S.radius.sm, padding: 16, border: `1px solid ${S.protocol.ICMP}30` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: S.protocol.ICMP }}>
                  <AlertTriangle className="w-4 h-4" />
                  <span style={{ fontSize: '0.875rem' }}>載入失敗：{error}</span>
                </div>
              </div>
            )}

            {/* 全部載入完成 */}
            {!preloadedPackets?.packets?.length && !hasMore && loadedCount > 0 && (
              <div style={{ textAlign: 'center', padding: '16px 0', color: S.text.secondary, fontSize: '0.875rem' }}>
                已載入全部 {loadedCount} 條連線
              </div>
            )}

            {/* PacketInspector now renders inline below the selected packet card */}
          </div>
        )}
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════
   PreloadedPacketList — Protocol-stage-grouped packet display
   ════════════════════════════════════════════════════════════ */

const MAX_VISIBLE_PER_STAGE = 10

function PreloadedPacketList({
  preloadedPackets, aggregatedConnection,
  activeParticleIndices, selectedPacketIndex, onPacketSelect,
  packetRefsMap, getHighlightStyle, getFlagBadgeStyle,
  inspectLoading, inspectedPacket, setInspectedPacket,
}) {
  const [expandedStages, setExpandedStages] = useState(new Set())

  // Build stage grouping using backend timeline stages (with packetRefs)
  // Pass client IP/port for direction-based HTTP(S) grouping
  const stageGrouping = useMemo(() => {
    const conn = aggregatedConnection?.connections?.[0]
    if (!conn?.stages) return null
    const stageMap = buildPacketStageMap([conn])
    // Determine client: src is always the initiator in WireMap's connection model
    const clientIp = conn.src || aggregatedConnection?.src
    // Extract client port from connection ID: "http-{srcIp}-{srcPort}-{dstIp}-{dstPort}"
    const idParts = (conn.originalId || conn.id || '').split('-')
    const clientPort = idParts.length >= 3 ? parseInt(idParts[2], 10) : undefined
    return groupPacketsByStage(
      preloadedPackets.packets, stageMap, conn.protocolType, conn.stages,
      { clientIp, clientPort }
    )
  }, [preloadedPackets, aggregatedConnection])

  // Packet card renderer (reusable)
  const renderPacketCard = (packet) => {
    const isActive = activeParticleIndices.has(packet.index)
    const isSelected = selectedPacketIndex === packet.index
    const hl = getHighlightStyle(isSelected, isActive)

    return (
      <div
        key={packet.index}
        ref={el => { if (el) packetRefsMap.current.set(packet.index, el) }}
        data-packet-index={packet.index}
        style={{ borderRadius: S.radius.sm, padding: 10, cursor: 'pointer', ...hl }}
        onClick={() => onPacketSelect?.(packet.index)}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: isSelected ? S.accent : isActive ? S.accent : S.text.primary, fontFamily: S.font.mono }}>
              #{packet.index}
            </span>
            {packet.headers?.tcp?.flags && (
              <span style={{
                fontSize: 10, padding: '1px 5px', borderRadius: S.radius.sm,
                fontFamily: S.font.mono, ...getFlagBadgeStyle(packet.headers.tcp.flags),
              }}>
                {packet.headers.tcp.flags}
              </span>
            )}
            {packet.errorType && (
              <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: S.radius.sm, background: `${S.protocol.ICMP}20`, color: S.protocol.ICMP, fontFamily: S.font.mono }}>
                {packet.errorType}
              </span>
            )}
            {isActive && (
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: S.accent, animation: 'pulse 2s infinite' }} />
            )}
          </div>
          <span style={{ fontSize: 10, color: S.text.tertiary, fontFamily: S.font.mono }}>
            {packet.relativeTime || '0.000s'}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 11 }}>
          <div>
            <span style={{ color: S.text.tertiary, fontSize: 9.5, letterSpacing: '0.08em', textTransform: 'uppercase' }}>來源</span>
            <div style={{ color: S.text.primary, fontFamily: S.font.mono, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {packet.fiveTuple?.srcIp}:{packet.fiveTuple?.srcPort}
            </div>
          </div>
          <div>
            <span style={{ color: S.text.tertiary, fontSize: 9.5, letterSpacing: '0.08em', textTransform: 'uppercase' }}>目的</span>
            <div style={{ color: S.text.primary, fontFamily: S.font.mono, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {packet.fiveTuple?.dstIp}:{packet.fiveTuple?.dstPort}
            </div>
          </div>
          {packet.length && (
            <div>
              <span style={{ color: S.text.tertiary, fontSize: 9.5, letterSpacing: '0.08em', textTransform: 'uppercase' }}>長度</span>
              <div style={{ color: S.text.primary, fontFamily: S.font.mono }}>{packet.length} bytes</div>
            </div>
          )}
          {packet.headers?.tcp?.seq && (
            <div>
              <span style={{ color: S.text.tertiary, fontSize: 9.5, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Seq</span>
              <div style={{ color: S.text.primary, fontFamily: S.font.mono }}>{packet.headers.tcp.seq}</div>
            </div>
          )}
        </div>

        {/* Inline packet detail */}
        {isSelected && selectedPacketIndex !== null && (
          <div style={{ marginTop: 8, borderTop: `1px solid ${S.border}`, paddingTop: 8 }}
               onClick={e => e.stopPropagation()}>
            {inspectLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '16px 0', color: S.text.secondary }}>
                <Loader className="w-4 h-4 animate-spin" />
                <span style={{ fontSize: '0.875rem' }}>載入封包詳情...</span>
              </div>
            ) : inspectedPacket ? (
              <PacketInspector
                packetDetail={inspectedPacket}
                onClose={() => { setInspectedPacket(null); onPacketSelect?.(null) }}
              />
            ) : null}
          </div>
        )}
      </div>
    )
  }

  // No stage data → flat list fallback
  if (!stageGrouping || stageGrouping.groups.length === 0) {
    return (
      <>
        <div style={{ marginBottom: 12, padding: 10, background: `${S.accent}12`, borderRadius: S.radius.sm, border: `1px solid ${S.accent}30` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: S.accent, fontSize: 12 }}>
            <Database size={14} />
            <span style={{ fontWeight: 500 }}>封包列表</span>
            <span style={{ fontSize: 11, color: S.text.secondary }}>（{preloadedPackets.packets.length} 封包）</span>
          </div>
        </div>
        {preloadedPackets.packets.map(renderPacketCard)}
      </>
    )
  }

  const { groups, orphanPackets, completedStages, totalStages, description } = stageGrouping
  const isComplete = completedStages === totalStages

  return (
    <>
      {/* ── Protocol Progress Header ── */}
      <div style={{
        padding: '12px 14px', marginBottom: 8,
        background: S.surface, border: `1px solid ${S.border}`, borderRadius: S.radius.md,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: S.text.primary, fontFamily: S.font.sans }}>
            {description}
          </span>
          <span style={{
            fontSize: 12, fontWeight: 600, fontFamily: S.font.mono,
            color: isComplete ? S.protocol.HTTP : S.protocol.ICMP,
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            {isComplete ? <CheckCircle size={13} /> : <AlertCircle size={13} />}
            {completedStages}/{totalStages}
          </span>
        </div>
        {/* Stage dots */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {groups.map((g, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{
                width: 7, height: 7, borderRadius: 1.5,
                background: g.missing ? 'transparent' : g.color,
                border: g.missing ? `1.5px dashed ${S.text.faint}` : 'none',
              }} />
              <span style={{
                fontSize: 10, fontWeight: 500, fontFamily: S.font.mono,
                color: g.missing ? S.text.faint : g.color,
                textDecoration: g.missing ? 'line-through' : 'none',
              }}>
                {g.stageKey}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Stage Groups ── */}
      {groups.map((group) => {
        const isExpanded = expandedStages.has(group.stageKey)
        const visiblePackets = group.packets.length > MAX_VISIBLE_PER_STAGE && !isExpanded
          ? group.packets.slice(0, MAX_VISIBLE_PER_STAGE)
          : group.packets
        const hasMore = group.packets.length > MAX_VISIBLE_PER_STAGE && !isExpanded

        return (
          <div key={group.stageKey} style={{
            borderLeft: `3px ${group.missing ? 'dashed' : 'solid'} ${group.missing ? S.text.faint : group.color}`,
            paddingLeft: 12, marginBottom: 12,
          }}>
            {/* Stage header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: 6, padding: '4px 0',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: S.text.tertiary, fontFamily: S.font.mono }}>
                  {group.stageIndex + 1}/{totalStages}
                </span>
                <span style={{ fontSize: 11, fontWeight: 600, color: group.missing ? S.text.faint : group.color, fontFamily: S.font.sans }}>
                  {group.stageLabel}
                </span>
                {group.icon && (
                  <span style={{ fontSize: 11, color: S.text.faint }}>{group.icon}</span>
                )}
              </div>
              {group.missing ? (
                <span style={{ fontSize: 10, color: S.protocol.ICMP, display: 'flex', alignItems: 'center', gap: 3 }}>
                  <AlertCircle size={11} /> 缺失
                </span>
              ) : (
                <span style={{ fontSize: 10, color: S.text.tertiary, fontFamily: S.font.mono }}>
                  {group.packets.length} 封包
                </span>
              )}
            </div>

            {/* Packet cards or missing placeholder */}
            {group.missing ? (
              <div style={{
                border: `1px dashed ${S.text.faint}`, borderRadius: S.radius.sm,
                padding: '10px 12px', color: S.text.faint, fontSize: 11,
                fontFamily: S.font.sans,
              }}>
                預期: {group.stageLabel} 封包
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {visiblePackets.map(renderPacketCard)}
                {hasMore && (
                  <button
                    onClick={() => setExpandedStages(prev => { const next = new Set(prev); next.add(group.stageKey); return next })}
                    style={{
                      padding: '6px 12px', fontSize: 10, fontWeight: 500,
                      color: group.color, background: group.color + '10',
                      border: `1px solid ${group.color}30`, borderRadius: S.radius.sm,
                      cursor: 'pointer', fontFamily: S.font.mono,
                    }}
                  >
                    展開剩餘 {group.packets.length - MAX_VISIBLE_PER_STAGE} 封包
                  </button>
                )}
              </div>
            )}
          </div>
        )
      })}

      {/* ── Orphan Packets ── */}
      {orphanPackets.length > 0 && (
        <div style={{
          borderLeft: `3px solid ${S.text.faint}`,
          paddingLeft: 12, marginBottom: 12,
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: S.text.tertiary, marginBottom: 6, fontFamily: S.font.sans }}>
            其他封包
            <span style={{ fontWeight: 400, marginLeft: 6, fontFamily: S.font.mono }}>{orphanPackets.length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {orphanPackets.map(renderPacketCard)}
          </div>
        </div>
      )}
    </>
  )
}
