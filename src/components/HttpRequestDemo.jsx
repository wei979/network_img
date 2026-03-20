import React, { useState, useEffect, useRef } from 'react'
import { Play, Pause, RotateCcw, Globe, Shield, CheckCircle, AlertCircle, XCircle } from 'lucide-react'
import { ProtocolAnimationController } from '../lib/ProtocolAnimationController'
import { S } from '../lib/swiss-tokens'
import TimelineControl from './TimelineControl'

const HttpRequestDemo = () => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [renderState, setRenderState] = useState(null)
  const [protocolType, setProtocolType] = useState('http-request')
  const [statusCode, setStatusCode] = useState(200)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const controllerRef = useRef(null)
  const rafRef = useRef(null)
  const lastTickRef = useRef(performance.now())

  useEffect(() => {
    const controller = protocolType === 'https-request'
      ? ProtocolAnimationController.createHttpsRequest(`demo-${protocolType}-192.168.1.100-80-192.168.1.200-443`, statusCode, { onStageEnter: (stage) => console.log('進入階段:', stage), onComplete: () => { setIsPlaying(false) } })
      : ProtocolAnimationController.createHttpRequest(`demo-${protocolType}-192.168.1.100-80-192.168.1.200-443`, statusCode, { onStageEnter: (stage) => console.log('進入階段:', stage), onComplete: () => { setIsPlaying(false) } })
    controllerRef.current = controller
    controller.reset()
    controller.setPlaybackSpeed(playbackSpeed)
    setRenderState(controller.getRenderableState())
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [protocolType, statusCode])

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

  const getStatusColor = () => { if (statusCode >= 200 && statusCode < 300) return S.protocol.HTTP; if (statusCode >= 300 && statusCode < 400) return '#eab308'; if (statusCode >= 400) return S.protocol.ICMP; return S.protocol.UDP }
  const getStatusIcon = () => { if (statusCode >= 200 && statusCode < 300) return <CheckCircle size={16} style={{ color: S.protocol.HTTP }} />; if (statusCode >= 300 && statusCode < 400) return <AlertCircle size={16} style={{ color: '#eab308' }} />; if (statusCode >= 400) return <XCircle size={16} style={{ color: S.protocol.ICMP }} />; return <Globe size={16} style={{ color: S.protocol.UDP }} /> }

  const timelineProgress = renderState?.timelineProgress || 0
  const totalDuration = controllerRef.current?.totalDuration || 100
  const currentTimeValue = timelineProgress * totalDuration
  const currentStage = renderState?.currentStage
  const visualEffects = renderState?.visualEffects || {}
  const nodeStroke = protocolType === 'https-request' ? S.protocol.HTTP : S.protocol.UDP

  return (
    <div style={{ maxWidth: '56rem', margin: '0 auto', padding: 24, background: S.bg, borderRadius: S.radius.md, border: `1px solid ${S.border}`, fontFamily: S.font.sans }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        {protocolType === 'https-request' ? <Shield size={24} style={{ color: S.protocol.HTTP }} /> : <Globe size={24} style={{ color: S.protocol.UDP }} />}
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: S.text.primary, margin: 0 }}>{protocolType === 'https-request' ? 'HTTPS' : 'HTTP'} 請求演示</h2>
      </div>

      {/* 控制選項 */}
      <div style={{ background: S.surface, borderRadius: S.radius.sm, padding: 16, marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: S.text.secondary, marginBottom: 8 }}>通訊協定類型</label>
            <select value={protocolType} onChange={(e) => setProtocolType(e.target.value)} disabled={isPlaying}
              style={{ width: '100%', padding: '8px 12px', background: S.surfaceHover, border: `1px solid ${S.border}`, borderRadius: S.radius.sm, color: S.text.primary }}>
              <option value="http-request">HTTP</option>
              <option value="https-request">HTTPS</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: S.text.secondary, marginBottom: 8 }}>狀態碼</label>
            <select value={statusCode} onChange={(e) => setStatusCode(parseInt(e.target.value))} disabled={isPlaying}
              style={{ width: '100%', padding: '8px 12px', background: S.surfaceHover, border: `1px solid ${S.border}`, borderRadius: S.radius.sm, color: S.text.primary }}>
              <option value={200}>200 OK</option><option value={201}>201 Created</option><option value={301}>301 Moved Permanently</option><option value={302}>302 Found</option><option value={400}>400 Bad Request</option><option value={401}>401 Unauthorized</option><option value={404}>404 Not Found</option><option value={500}>500 Internal Server Error</option><option value={503}>503 Service Unavailable</option>
            </select>
          </div>
        </div>
      </div>

      {/* 動畫視覺化區域 */}
      <div style={{ background: S.surface, borderRadius: S.radius.sm, padding: 24, marginBottom: 24 }}>
        <svg viewBox="0 0 100 40" style={{ width: '100%', height: '8rem' }}>
          <circle cx="20" cy="20" r="3" fill={S.bg} stroke={nodeStroke} strokeWidth="0.5" />
          <text x="20" y="30" textAnchor="middle" fill={S.text.primary} fontSize="3" fontWeight="600">客戶端</text>
          <circle cx="80" cy="20" r="3" fill={S.bg} stroke={getStatusColor()} strokeWidth="0.5" />
          <text x="80" y="30" textAnchor="middle" fill={S.text.primary} fontSize="3" fontWeight="600">伺服器</text>
          <line x1="20" y1="20" x2="80" y2="20" stroke={renderState?.protocolColor || nodeStroke} strokeWidth="1" strokeLinecap="round" strokeOpacity="0.4" strokeDasharray={renderState?.connectionStyle === 'dashed' ? '2,2' : 'none'} />
          {renderState && (
            <circle cx={20 + 60 * Math.max(0, Math.min(1, renderState.dotPosition || 0))} cy="20" r={visualEffects.pulsing ? "2" : "1.5"} fill={renderState.protocolColor || nodeStroke} opacity={visualEffects.blinking ? "0.5" : "1"}>
              {visualEffects.pulsing && <animate attributeName="r" values="1.5;2.5;1.5" dur="1s" repeatCount="indefinite" />}
              {visualEffects.blinking && <animate attributeName="opacity" values="0.3;1;0.3" dur="0.8s" repeatCount="indefinite" />}
            </circle>
          )}
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
              <span style={{ fontWeight: 500, color: nodeStroke }}>{currentStage.label || currentStage.step}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: S.text.secondary }}>方向:</span>
              <span style={{ color: S.text.secondary }}>{currentStage.direction === 'forward' ? '客戶端 → 伺服器' : '伺服器 → 客戶端'}</span>
            </div>
            {currentStage.description && <div style={{ marginTop: 8 }}><span style={{ color: S.text.secondary }}>說明:</span><p style={{ color: S.text.secondary, fontSize: '0.875rem', marginTop: 4 }}>{currentStage.description}</p></div>}
          </div>
        ) : <p style={{ color: S.text.secondary }}>等待開始...</p>}

        {renderState?.isCompleted && (
          <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${S.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {getStatusIcon()}
              <span style={{ fontWeight: 500, color: getStatusColor() }}>HTTP {statusCode}</span>
              <span style={{ color: S.text.secondary, fontSize: '0.875rem' }}>
                {statusCode >= 200 && statusCode < 300 && '成功'}
                {statusCode >= 300 && statusCode < 400 && '重導向'}
                {statusCode >= 400 && statusCode < 500 && '客戶端錯誤'}
                {statusCode >= 500 && '伺服器錯誤'}
              </span>
            </div>
          </div>
        )}

        {Object.keys(visualEffects).some(key => visualEffects[key] && key !== 'opacity' && key !== 'connectionStyle') && (
          <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${S.border}` }}>
            <span style={{ color: S.text.secondary, fontSize: '0.875rem' }}>視覺效果:</span>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              {visualEffects.blinking && <span style={{ padding: '4px 8px', background: '#eab30820', color: '#fbbf24', fontSize: '0.75rem', borderRadius: S.radius.sm }}>閃爍</span>}
              {visualEffects.pulsing && <span style={{ padding: '4px 8px', background: `${S.protocol.UDP}20`, color: S.protocol.UDP, fontSize: '0.75rem', borderRadius: S.radius.sm }}>脈衝</span>}
              {visualEffects.spinning && <span style={{ padding: '4px 8px', background: `${S.protocol.DNS}20`, color: S.protocol.DNS, fontSize: '0.75rem', borderRadius: S.radius.sm }}>旋轉</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default HttpRequestDemo
