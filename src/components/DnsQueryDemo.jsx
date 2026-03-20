import React, { useState, useEffect, useRef } from 'react'
import { Play, Pause, RotateCcw, Search, Server, CheckCircle, XCircle } from 'lucide-react'
import { ProtocolAnimationController } from '../lib/ProtocolAnimationController'
import { S } from '../lib/swiss-tokens'
import TimelineControl from './TimelineControl'

const DnsQueryDemo = () => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [renderState, setRenderState] = useState(null)
  const [queryDomain, setQueryDomain] = useState('example.com')
  const [resolvedIP, setResolvedIP] = useState('93.184.216.34')
  const [queryType, setQueryType] = useState('A')
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const controllerRef = useRef(null)
  const rafRef = useRef(null)
  const lastTickRef = useRef(performance.now())

  useEffect(() => {
    const controller = ProtocolAnimationController.createDnsQuery(`demo-dns-query-${queryDomain}-${Date.now()}`, resolvedIP, { onStageEnter: (stage) => console.log('進入階段:', stage), onComplete: () => { setIsPlaying(false) } })
    controllerRef.current = controller
    controller.reset()
    controller.setPlaybackSpeed(playbackSpeed)
    setRenderState(controller.getRenderableState())
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [queryDomain, resolvedIP])

  useEffect(() => {
    if (!isPlaying || !controllerRef.current) { if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }; return }
    lastTickRef.current = performance.now()
    const tick = (ts) => { const d = ts - lastTickRef.current; lastTickRef.current = ts; controllerRef.current.advance(d); const ns = controllerRef.current.getRenderableState(); setRenderState(ns); if (isPlaying && !ns.isCompleted) rafRef.current = requestAnimationFrame(tick); else if (ns.isCompleted) setIsPlaying(false) }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null } }
  }, [isPlaying])

  useEffect(() => { if (controllerRef.current) controllerRef.current.setPlaybackSpeed(playbackSpeed) }, [playbackSpeed])

  const handlePlay = () => setIsPlaying(true)
  const handlePause = () => setIsPlaying(false)
  const handleReset = () => { setIsPlaying(false); if (controllerRef.current) { controllerRef.current.reset(); controllerRef.current.setPlaybackSpeed(playbackSpeed); setRenderState(controllerRef.current.getRenderableState()) } }
  const handleSeek = (p) => { if (controllerRef.current) { controllerRef.current.seekToProgress(p); setRenderState(controllerRef.current.getRenderableState()) } }
  const handleSpeedChange = (s) => { setPlaybackSpeed(s); if (controllerRef.current) controllerRef.current.setPlaybackSpeed(s) }

  const getQueryColor = () => { const cs = renderState?.currentStage; if (cs?.step === 'Response') return S.protocol.HTTP; if (cs?.step === 'Waiting') return '#f59e0b'; if (cs?.step === 'Query') return S.protocol.UDP; return S.text.tertiary }

  const timelineProgress = renderState?.timelineProgress || 0
  const totalDuration = controllerRef.current?.totalDuration || 100
  const currentTimeValue = timelineProgress * totalDuration
  const currentStage = renderState?.currentStage
  const visualEffects = renderState?.visualEffects || {}

  const inputStyle = { width: '100%', padding: '8px 12px', background: S.surfaceHover, border: `1px solid ${S.border}`, borderRadius: S.radius.sm, color: S.text.primary, fontFamily: S.font.sans }

  return (
    <div style={{ maxWidth: '56rem', margin: '0 auto', padding: 24, background: S.bg, borderRadius: S.radius.md, border: `1px solid ${S.border}`, fontFamily: S.font.sans }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Search size={24} style={{ color: S.protocol.DNS }} />
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: S.text.primary, margin: 0 }}>DNS 查詢視覺化演示</h2>
      </div>

      {/* 控制選項 */}
      <div style={{ background: S.surface, borderRadius: S.radius.sm, padding: 16, marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: S.text.secondary, marginBottom: 8 }}>查詢網域</label>
            <input type="text" value={queryDomain} onChange={(e) => setQueryDomain(e.target.value)} disabled={isPlaying} placeholder="example.com" style={inputStyle} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: S.text.secondary, marginBottom: 8 }}>解析結果 IP</label>
            <input type="text" value={resolvedIP} onChange={(e) => setResolvedIP(e.target.value)} disabled={isPlaying} placeholder="93.184.216.34" style={inputStyle} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: S.text.secondary, marginBottom: 8 }}>查詢類型</label>
            <select value={queryType} onChange={(e) => setQueryType(e.target.value)} disabled={isPlaying} style={inputStyle}>
              <option value="A">A (IPv4)</option><option value="AAAA">AAAA (IPv6)</option><option value="CNAME">CNAME</option><option value="MX">MX</option><option value="TXT">TXT</option>
            </select>
          </div>
        </div>
      </div>

      {/* 動畫區域 */}
      <div style={{ background: S.surface, borderRadius: S.radius.sm, padding: 24, marginBottom: 24 }}>
        <svg viewBox="0 0 100 40" style={{ width: '100%', height: '8rem' }}>
          <circle cx="20" cy="20" r="3" fill={S.bg} stroke={getQueryColor()} strokeWidth="0.5" />
          <text x="20" y="30" textAnchor="middle" fill={S.text.primary} fontSize="3" fontWeight="600">客戶端</text>
          <circle cx="80" cy="20" r="3" fill={S.bg} stroke={currentStage?.step === 'Response' ? S.protocol.HTTP : getQueryColor()} strokeWidth="0.5" />
          <text x="80" y="30" textAnchor="middle" fill={S.text.primary} fontSize="3" fontWeight="600">DNS 伺服器</text>
          <line x1="20" y1="20" x2="80" y2="20" stroke={getQueryColor()} strokeWidth="1" strokeLinecap="round" strokeOpacity="0.4" strokeDasharray={currentStage?.step === 'Waiting' ? '2,2' : 'none'}>
            {currentStage?.step === 'Waiting' && <animate attributeName="stroke-dashoffset" values="0;4" dur="1s" repeatCount="indefinite" />}
          </line>
          {renderState && (
            <circle cx={20 + 60 * Math.max(0, Math.min(1, renderState.dotPosition || 0))} cy="20" r={visualEffects.pulsing ? "2" : "1.5"} fill={renderState.protocolColor || getQueryColor()} opacity={visualEffects.blinking ? "0.5" : "1"}>
              {visualEffects.pulsing && <animate attributeName="r" values="1.5;2.5;1.5" dur="1s" repeatCount="indefinite" />}
              {visualEffects.blinking && <animate attributeName="opacity" values="0.3;1;0.3" dur="0.5s" repeatCount="indefinite" />}
            </circle>
          )}
          {currentStage?.step === 'Waiting' && <g transform="translate(80, 20)"><circle cx="0" cy="0" r="1" fill="none" stroke="#f59e0b" strokeWidth="0.3" strokeDasharray="3,1"><animateTransform attributeName="transform" type="rotate" values="0;360" dur="1s" repeatCount="indefinite" /></circle></g>}
          {currentStage?.step === 'Query' && <g transform="translate(30, 15)"><circle cx="0" cy="0" r="2" fill="none" stroke={S.protocol.UDP} strokeWidth="0.3" /><text x="0" y="1" textAnchor="middle" fill={S.protocol.UDP} fontSize="1.5" fontWeight="bold">?</text></g>}
          {currentStage?.step === 'Response' && <g transform="translate(70, 15)"><circle cx="0" cy="0" r="2" fill={S.protocol.HTTP} opacity="0.8"><animate attributeName="opacity" values="0.4;0.8;0.4" dur="1s" repeatCount="indefinite" /></circle><text x="0" y="1" textAnchor="middle" fill={S.text.primary} fontSize="1.5" fontWeight="bold">✓</text></g>}
          {currentStage && <text x="50" y="12" textAnchor="middle" fill={S.text.primary} fontSize="2.5" fontWeight="600">{currentStage.label || currentStage.step}</text>}
        </svg>
      </div>

      <TimelineControl isPlaying={isPlaying} onPlay={handlePlay} onPause={handlePause} onReset={handleReset} progress={timelineProgress} onSeek={handleSeek} currentTime={currentTimeValue} duration={totalDuration} playbackSpeed={playbackSpeed} onSpeedChange={handleSpeedChange} isCompleted={renderState?.isCompleted || false} wrapperStyle={{ marginBottom: 16 }} showTimeDisplay={false} />

      {/* 階段資訊 */}
      <div style={{ background: S.surface, borderRadius: S.radius.sm, padding: 16, marginTop: 16 }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: S.text.primary, marginBottom: 12, marginTop: 0 }}>當前階段</h3>
        {currentStage ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: S.text.secondary }}>階段:</span>
              <span style={{ fontWeight: 500, color: currentStage.step === 'Response' ? S.protocol.HTTP : currentStage.step === 'Waiting' ? '#f59e0b' : S.protocol.UDP }}>{currentStage.label || currentStage.step}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: S.text.secondary }}>查詢:</span>
              <span style={{ color: S.text.secondary, fontFamily: S.font.mono }}>{queryDomain} ({queryType})</span>
            </div>
            {currentStage.step === 'Response' && resolvedIP && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ color: S.text.secondary }}>解析結果:</span>
                <span style={{ color: S.protocol.HTTP, fontFamily: S.font.mono }}>{resolvedIP}</span>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: S.text.secondary }}>狀態:</span>
              <span style={{ color: S.text.secondary }}>
                {currentStage.step === 'Query' && '傳送 DNS 查詢'}
                {currentStage.step === 'Waiting' && '等待 DNS 伺服器回應'}
                {currentStage.step === 'Response' && '收到 DNS 回應'}
              </span>
            </div>
          </div>
        ) : <p style={{ color: S.text.secondary }}>等待開始...</p>}

        {currentStage?.step === 'Response' && (
          <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${S.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 12, background: `${S.protocol.HTTP}14`, border: `1px solid ${S.protocol.HTTP}30`, borderRadius: S.radius.sm }}>
              <CheckCircle size={20} style={{ color: S.protocol.HTTP }} />
              <div>
                <p style={{ fontWeight: 500, color: S.protocol.HTTP, margin: 0 }}>DNS 查詢成功</p>
                <p style={{ color: S.protocol.HTTP, fontSize: '0.875rem', margin: 0, opacity: 0.8 }}>網域 {queryDomain} 解析為 {resolvedIP}</p>
              </div>
            </div>
          </div>
        )}

        {Object.keys(visualEffects).some(key => visualEffects[key] && key !== 'opacity' && key !== 'connectionStyle') && (
          <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${S.border}` }}>
            <span style={{ color: S.text.secondary, fontSize: '0.875rem' }}>視覺效果:</span>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              {visualEffects.spinning && <span style={{ padding: '4px 8px', background: '#eab30820', color: '#fbbf24', fontSize: '0.75rem', borderRadius: S.radius.sm }}>旋轉等待</span>}
              {visualEffects.pulsing && <span style={{ padding: '4px 8px', background: `${S.protocol.UDP}20`, color: S.protocol.UDP, fontSize: '0.75rem', borderRadius: S.radius.sm }}>脈衝查詢</span>}
              {visualEffects.blinking && <span style={{ padding: '4px 8px', background: `${S.protocol.HTTP}20`, color: S.protocol.HTTP, fontSize: '0.75rem', borderRadius: S.radius.sm }}>閃爍回應</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default DnsQueryDemo
