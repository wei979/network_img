import React, { useState, useEffect, useRef } from 'react'
import { Play, Pause, RotateCcw, Zap, Send, Package } from 'lucide-react'
import { ProtocolAnimationController } from '../lib/ProtocolAnimationController'
import { S } from '../lib/swiss-tokens'
import TimelineControl from './TimelineControl'

const UdpTransferDemo = () => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [renderState, setRenderState] = useState(null)
  const [packetCount, setPacketCount] = useState(5)
  const [transferSpeed, setTransferSpeed] = useState('normal')
  const [dataSize, setDataSize] = useState('1KB')
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const controllerRef = useRef(null)
  const rafRef = useRef(null)
  const lastTickRef = useRef(performance.now())

  const getSpeedMultiplier = () => { switch (transferSpeed) { case 'slow': return 0.5; case 'fast': return 2; case 'very-fast': return 4; default: return 1 } }

  useEffect(() => {
    const controller = ProtocolAnimationController.createUdpTransfer(`demo-udp-transfer-192.168.1.100-8080-192.168.1.200-9090-${Date.now()}`, { onStageEnter: (stage) => console.log('進入階段:', stage), onComplete: () => { setIsPlaying(false) } })
    controllerRef.current = controller
    controller.reset()
    controller.setPlaybackSpeed(playbackSpeed * getSpeedMultiplier())
    setRenderState(controller.getRenderableState())
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [packetCount, transferSpeed, dataSize])

  useEffect(() => {
    if (!isPlaying || !controllerRef.current) { if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }; return }
    lastTickRef.current = performance.now()
    const tick = (ts) => { const d = ts - lastTickRef.current; lastTickRef.current = ts; controllerRef.current.advance(d); const ns = controllerRef.current.getRenderableState(); setRenderState(ns); if (isPlaying && !ns.isCompleted) rafRef.current = requestAnimationFrame(tick); else if (ns.isCompleted) setIsPlaying(false) }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null } }
  }, [isPlaying])

  useEffect(() => { if (controllerRef.current) controllerRef.current.setPlaybackSpeed(playbackSpeed * getSpeedMultiplier()) }, [playbackSpeed])

  const handlePlay = () => setIsPlaying(true)
  const handlePause = () => setIsPlaying(false)
  const handleReset = () => { setIsPlaying(false); if (controllerRef.current) { controllerRef.current.reset(); controllerRef.current.setPlaybackSpeed(playbackSpeed); setRenderState(controllerRef.current.getRenderableState()) } }
  const handleSeek = (p) => { if (controllerRef.current) { controllerRef.current.seekToProgress(p); setRenderState(controllerRef.current.getRenderableState()) } }
  const handleSpeedChange = (s) => { setPlaybackSpeed(s); if (controllerRef.current) controllerRef.current.setPlaybackSpeed(s * getSpeedMultiplier()) }

  const getTransferColor = () => { const cs = renderState?.currentStage; if (cs?.step === 'Transfer') return S.protocol.UDP; if (cs?.step === 'Send') return S.protocol.HTTP; return S.text.tertiary }

  const timelineProgress = renderState?.timelineProgress || 0
  const totalDuration = controllerRef.current?.totalDuration || 100
  const currentTimeValue = timelineProgress * totalDuration
  const currentStage = renderState?.currentStage
  const stageProgress = Math.round(timelineProgress * 100)
  const visualEffects = renderState?.visualEffects || {}

  const generatePacketPositions = () => {
    const packets = []
    const basePosition = renderState?.dotPosition || 0
    const speedMult = getSpeedMultiplier()
    for (let i = 0; i < packetCount; i++) {
      const offset = (i * 0.1 * speedMult) % 1
      const position = Math.max(0, Math.min(1, basePosition - offset))
      packets.push({ id: i, position, opacity: position > 0 ? 1 : 0.3 })
    }
    return packets
  }

  const packets = generatePacketPositions()
  const selectStyle = { width: '100%', padding: '8px 12px', background: S.surfaceHover, border: `1px solid ${S.border}`, borderRadius: S.radius.sm, color: S.text.primary }

  return (
    <div style={{ maxWidth: '56rem', margin: '0 auto', padding: 24, background: S.bg, borderRadius: S.radius.md, border: `1px solid ${S.border}`, fontFamily: S.font.sans }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Zap size={24} style={{ color: S.protocol.UDP }} />
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: S.text.primary, margin: 0 }}>UDP 傳輸視覺化演示</h2>
      </div>

      {/* 控制選項 */}
      <div style={{ background: S.surface, borderRadius: S.radius.sm, padding: 16, marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: S.text.secondary, marginBottom: 8 }}>資料封包數量</label>
            <select value={packetCount} onChange={(e) => setPacketCount(parseInt(e.target.value))} disabled={isPlaying} style={selectStyle}>
              <option value={3}>3 個包</option><option value={5}>5 個包</option><option value={10}>10 個包</option><option value={20}>20 個包</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: S.text.secondary, marginBottom: 8 }}>傳輸速度</label>
            <select value={transferSpeed} onChange={(e) => setTransferSpeed(e.target.value)} disabled={isPlaying} style={selectStyle}>
              <option value="slow">慢速</option><option value="normal">正常</option><option value="fast">快速</option><option value="very-fast">極速</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: S.text.secondary, marginBottom: 8 }}>數據大小</label>
            <select value={dataSize} onChange={(e) => setDataSize(e.target.value)} disabled={isPlaying} style={selectStyle}>
              <option value="512B">512 位元組</option><option value="1KB">1 KB</option><option value="4KB">4 KB</option><option value="64KB">64 KB</option>
            </select>
          </div>
        </div>
      </div>

      {/* 動畫區域 */}
      <div style={{ background: S.surface, borderRadius: S.radius.sm, padding: 24, marginBottom: 24 }}>
        <svg viewBox="0 0 100 40" style={{ width: '100%', height: '8rem' }}>
          <defs>
            <linearGradient id="speedGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={S.protocol.UDP} stopOpacity="0.2" />
              <stop offset="50%" stopColor={S.protocol.UDP} stopOpacity="0.8" />
              <stop offset="100%" stopColor={S.protocol.UDP} stopOpacity="0.2" />
            </linearGradient>
          </defs>
          <circle cx="20" cy="20" r="3" fill={S.bg} stroke={getTransferColor()} strokeWidth="0.5" />
          <text x="20" y="30" textAnchor="middle" fill={S.text.primary} fontSize="3" fontWeight="600">發送端</text>
          <circle cx="80" cy="20" r="3" fill={S.bg} stroke={getTransferColor()} strokeWidth="0.5" />
          <text x="80" y="30" textAnchor="middle" fill={S.text.primary} fontSize="3" fontWeight="600">接收端</text>
          <line x1="20" y1="20" x2="80" y2="20" stroke={getTransferColor()} strokeWidth="1" strokeLinecap="round" strokeOpacity="0.6" strokeDasharray="3,2">
            <animate attributeName="stroke-dashoffset" values="0;5" dur="0.5s" repeatCount="indefinite" />
          </line>
          {currentStage?.step === 'Transfer' && transferSpeed !== 'slow' && (
            <line x1="20" y1="20" x2="80" y2="20" stroke="url(#speedGradient)" strokeWidth="2" strokeLinecap="round" opacity="0.7">
              <animate attributeName="opacity" values="0.3;0.7;0.3" dur="0.3s" repeatCount="indefinite" />
            </line>
          )}
          {packets.map((packet) => (
            <g key={packet.id}>
              <circle cx={20 + 60 * packet.position} cy={20 + (packet.id % 2 === 0 ? -1 : 1) * (packet.id * 0.5)} r="1" fill={getTransferColor()} opacity={packet.opacity}>
                {packet.position > 0 && packet.position < 1 && <animate attributeName="r" values="1;1.5;1" dur="0.2s" repeatCount="indefinite" />}
              </circle>
              {packet.position > 0 && packet.position < 1 && (
                <circle cx={20 + 60 * Math.max(0, packet.position - 0.05)} cy={20 + (packet.id % 2 === 0 ? -1 : 1) * (packet.id * 0.5)} r="0.5" fill={getTransferColor()} opacity="0.3" />
              )}
            </g>
          ))}
          {currentStage?.step === 'Send' && <g transform="translate(25, 15)"><circle cx="0" cy="0" r="2" fill={S.protocol.HTTP} opacity="0.8"><animate attributeName="opacity" values="0.4;0.8;0.4" dur="0.5s" repeatCount="indefinite" /></circle><text x="0" y="1" textAnchor="middle" fill={S.text.primary} fontSize="1.5" fontWeight="bold">→</text></g>}
          {stageProgress > 50 && <g transform="translate(75, 15)"><circle cx="0" cy="0" r="2" fill={S.protocol.UDP} opacity="0.8"><animate attributeName="opacity" values="0.4;0.8;0.4" dur="0.3s" repeatCount="indefinite" /></circle><text x="0" y="1" textAnchor="middle" fill={S.text.primary} fontSize="1.5" fontWeight="bold">✓</text></g>}
          {currentStage && <text x="50" y="12" textAnchor="middle" fill={S.text.primary} fontSize="2.5" fontWeight="600">{currentStage.label || currentStage.step}</text>}
        </svg>
      </div>

      <TimelineControl isPlaying={isPlaying} onPlay={handlePlay} onPause={handlePause} onReset={handleReset} progress={timelineProgress} onSeek={handleSeek} currentTime={currentTimeValue} duration={totalDuration} playbackSpeed={playbackSpeed} onSpeedChange={handleSpeedChange} isCompleted={renderState?.isCompleted || false} wrapperStyle={{ marginBottom: 16 }} showTimeDisplay={false} />

      {/* 控制面板 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={isPlaying ? handlePause : handlePlay} disabled={renderState?.isCompleted}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: currentStage?.step === 'Transfer' ? S.protocol.UDP : currentStage?.step === 'Send' ? S.protocol.HTTP : S.surfaceHover, color: S.text.primary, borderRadius: S.radius.sm, border: 'none', cursor: 'pointer' }}>
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            {isPlaying ? '暫停' : '播放'}
          </button>
          <button onClick={handleReset} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: S.surfaceHover, color: S.text.primary, borderRadius: S.radius.sm, border: 'none', cursor: 'pointer' }}>
            <RotateCcw size={16} />
            重置
          </button>
        </div>
        <div style={{ fontSize: '0.875rem', color: S.text.secondary }}>進度: {stageProgress}%</div>
      </div>

      {/* 階段資訊 */}
      <div style={{ background: S.surface, borderRadius: S.radius.sm, padding: 16 }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: S.text.primary, marginBottom: 12, marginTop: 0 }}>當前階段</h3>
        {currentStage ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: S.text.secondary }}>階段:</span>
              <span style={{ fontWeight: 500, color: currentStage.step === 'Transfer' ? S.protocol.UDP : currentStage.step === 'Send' ? S.protocol.HTTP : S.text.secondary }}>{currentStage.label || currentStage.step}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: S.text.secondary }}>協議:</span>
              <span style={{ color: S.protocol.UDP, fontFamily: S.font.mono }}>UDP</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: S.text.secondary }}>數據包:</span>
              <span style={{ color: S.text.secondary }}>{packetCount} 個 ({dataSize})</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: S.text.secondary }}>傳輸速度:</span>
              <span style={{ color: S.text.secondary }}>
                {transferSpeed === 'slow' && '慢速'}{transferSpeed === 'normal' && '正常'}{transferSpeed === 'fast' && '快速'}{transferSpeed === 'very-fast' && '極速'}
              </span>
            </div>
          </div>
        ) : <p style={{ color: S.text.secondary }}>等待開始...</p>}

        {/* UDP 特性說明 */}
        <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${S.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 12, background: `${S.protocol.UDP}14`, border: `1px solid ${S.protocol.UDP}30`, borderRadius: S.radius.sm }}>
            <Zap size={20} style={{ color: S.protocol.UDP }} />
            <div>
              <p style={{ fontWeight: 500, color: S.protocol.UDP, margin: 0 }}>UDP 通訊協定特性</p>
              <p style={{ color: S.protocol.UDP, fontSize: '0.875rem', margin: 0, opacity: 0.8 }}>無連接、快速傳輸、不保證可靠性，適合即時通訊和串流媒體</p>
            </div>
          </div>
        </div>

        {Object.keys(visualEffects).some(key => visualEffects[key] && key !== 'opacity' && key !== 'connectionStyle') && (
          <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${S.border}` }}>
            <span style={{ color: S.text.secondary, fontSize: '0.875rem' }}>視覺效果:</span>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              {visualEffects.fastMovement && <span style={{ padding: '4px 8px', background: `${S.protocol.UDP}20`, color: S.protocol.UDP, fontSize: '0.75rem', borderRadius: S.radius.sm }}>快速移動</span>}
              {visualEffects.multiplePackets && <span style={{ padding: '4px 8px', background: `${S.protocol.HTTP}20`, color: S.protocol.HTTP, fontSize: '0.75rem', borderRadius: S.radius.sm }}>多包傳輸</span>}
              {visualEffects.dashedConnection && <span style={{ padding: '4px 8px', background: '#eab30820', color: '#fbbf24', fontSize: '0.75rem', borderRadius: S.radius.sm }}>虛線連接</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default UdpTransferDemo
