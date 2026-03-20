import React, { useState, useEffect, useRef } from 'react'
import { Play, Pause, RotateCcw, WifiOff } from 'lucide-react'
import { ProtocolAnimationController } from '../lib/ProtocolAnimationController'
import { S } from '../lib/swiss-tokens'
import TimelineControl from './TimelineControl'

const TcpTeardownDemo = () => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [renderState, setRenderState] = useState(null)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const controllerRef = useRef(null)
  const rafRef = useRef(null)
  const lastTickRef = useRef(performance.now())

  useEffect(() => {
    const controller = ProtocolAnimationController.createTcpTeardown(
      'demo-tcp-teardown-192.168.1.100-80-192.168.1.200-12345',
      {
        onStageEnter: (stage) => console.log('進入階段:', stage),
        onComplete: () => { console.log('TCP 四次揮手完成'); setIsPlaying(false) }
      }
    )
    controllerRef.current = controller
    controller.reset()
    controller.setPlaybackSpeed(playbackSpeed)
    setRenderState(controller.getRenderableState())
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [])

  useEffect(() => {
    if (!isPlaying || !controllerRef.current) {
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
      return
    }
    lastTickRef.current = performance.now()
    const tick = (timestamp) => {
      const delta = timestamp - lastTickRef.current
      lastTickRef.current = timestamp
      controllerRef.current.advance(delta)
      const newState = controllerRef.current.getRenderableState()
      setRenderState(newState)
      if (isPlaying && !newState.isCompleted) rafRef.current = requestAnimationFrame(tick)
      else if (newState.isCompleted) setIsPlaying(false)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null } }
  }, [isPlaying])

  useEffect(() => { if (controllerRef.current) controllerRef.current.setPlaybackSpeed(playbackSpeed) }, [playbackSpeed])

  const handlePlay = () => setIsPlaying(true)
  const handlePause = () => setIsPlaying(false)
  const handleReset = () => { setIsPlaying(false); if (controllerRef.current) { controllerRef.current.reset(); controllerRef.current.setPlaybackSpeed(playbackSpeed); setRenderState(controllerRef.current.getRenderableState()) } }
  const handleSeek = (p) => { if (controllerRef.current) { controllerRef.current.seekToProgress(p); setRenderState(controllerRef.current.getRenderableState()) } }
  const handleSpeedChange = (s) => { setPlaybackSpeed(s); if (controllerRef.current) controllerRef.current.setPlaybackSpeed(s) }

  const timelineProgress = renderState?.timelineProgress || 0
  const totalDuration = controllerRef.current?.totalDuration || 100
  const currentTimeValue = timelineProgress * totalDuration
  const currentStage = renderState?.currentStage
  const stageProgress = Math.round(timelineProgress * 100)
  const visualEffects = renderState?.visualEffects || {}

  return (
    <div style={{ maxWidth: '56rem', margin: '0 auto', padding: 24, background: S.bg, borderRadius: S.radius.md, border: `1px solid ${S.border}`, fontFamily: S.font.sans }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <WifiOff size={24} style={{ color: S.protocol.ICMP }} />
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: S.text.primary, margin: 0 }}>TCP 四次揮手演示</h2>
      </div>

      <div style={{ background: S.surface, borderRadius: S.radius.sm, padding: 24, marginBottom: 24 }}>
        <svg viewBox="0 0 100 40" style={{ width: '100%', height: '8rem' }}>
          <circle cx="20" cy="20" r="3" fill={S.bg} stroke={S.protocol.ICMP} strokeWidth="0.5" />
          <text x="20" y="30" textAnchor="middle" fill={S.text.primary} fontSize="3" fontWeight="600">{'\u5BA2\u6236\u7AEF'}</text>
          <circle cx="80" cy="20" r="3" fill={S.bg} stroke={S.protocol.ICMP} strokeWidth="0.5" />
          <text x="80" y="30" textAnchor="middle" fill={S.text.primary} fontSize="3" fontWeight="600">{'\u4F3A\u670D\u5668'}</text>
          <line x1="20" y1="20" x2="80" y2="20" stroke={renderState?.protocolColor || S.protocol.ICMP} strokeWidth="1" strokeLinecap="round" strokeOpacity="0.4" strokeDasharray={renderState?.connectionStyle === 'dashed' ? '2,2' : 'none'} />
          {renderState && (
            <circle cx={20 + 60 * Math.max(0, Math.min(1, renderState.dotPosition || 0))} cy="20" r={visualEffects.pulsing ? "2" : "1.5"} fill={renderState.protocolColor || S.protocol.ICMP} opacity={visualEffects.blinking ? "0.5" : "1"}>
              {visualEffects.pulsing && <animate attributeName="r" values="1.5;2.5;1.5" dur="1s" repeatCount="indefinite" />}
              {visualEffects.blinking && <animate attributeName="opacity" values="0.3;1;0.3" dur="0.8s" repeatCount="indefinite" />}
            </circle>
          )}
          {currentStage && <text x="50" y="12" textAnchor="middle" fill={S.text.primary} fontSize="2.5" fontWeight="600">{currentStage.label || currentStage.step}</text>}
        </svg>
      </div>

      <TimelineControl isPlaying={isPlaying} onPlay={handlePlay} onPause={handlePause} onReset={handleReset} progress={timelineProgress} onSeek={handleSeek} currentTime={currentTimeValue} duration={totalDuration} playbackSpeed={playbackSpeed} onSpeedChange={handleSpeedChange} isCompleted={renderState?.isCompleted || false} wrapperStyle={{ marginBottom: 16 }} showTimeDisplay={false} />

      {/* 控制面板 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={isPlaying ? handlePause : handlePlay} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: S.accent, color: S.text.primary, borderRadius: S.radius.sm, border: 'none', cursor: 'pointer' }} disabled={renderState?.isCompleted}>
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            {isPlaying ? '暫停' : '播放'}
          </button>
          <button onClick={handleReset} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: S.surfaceHover, color: S.text.primary, borderRadius: S.radius.sm, border: 'none', cursor: 'pointer' }}>
            <RotateCcw size={16} />
            重設
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
              <span style={{ color: S.protocol.ICMP, fontWeight: 500 }}>{currentStage.label || currentStage.step}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: S.text.secondary }}>方向:</span>
              <span style={{ color: S.text.secondary }}>{currentStage.direction === 'forward' ? '客戶端 → 伺服器' : '伺服器 → 客戶端'}</span>
            </div>
            {currentStage.description && (
              <div style={{ marginTop: 8 }}>
                <span style={{ color: S.text.secondary }}>說明:</span>
                <p style={{ color: S.text.secondary, fontSize: '0.875rem', marginTop: 4 }}>{currentStage.description}</p>
              </div>
            )}
          </div>
        ) : (
          <p style={{ color: S.text.secondary }}>等待開始...</p>
        )}

        {Object.keys(visualEffects).some(key => visualEffects[key] && key !== 'opacity' && key !== 'connectionStyle') && (
          <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${S.border}` }}>
            <span style={{ color: S.text.secondary, fontSize: '0.875rem' }}>視覺效果:</span>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              {visualEffects.blinking && <span style={{ padding: '4px 8px', background: `#eab30820`, color: '#fbbf24', fontSize: '0.75rem', borderRadius: S.radius.sm }}>閃爍</span>}
              {visualEffects.pulsing && <span style={{ padding: '4px 8px', background: `${S.protocol.UDP}20`, color: S.protocol.UDP, fontSize: '0.75rem', borderRadius: S.radius.sm }}>脈衝</span>}
              {visualEffects.spinning && <span style={{ padding: '4px 8px', background: `${S.protocol.DNS}20`, color: S.protocol.DNS, fontSize: '0.75rem', borderRadius: S.radius.sm }}>旋轉</span>}
            </div>
          </div>
        )}

        {renderState?.isCompleted && (
          <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${S.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: S.protocol.ICMP }}>
              <WifiOff size={16} />
              <span style={{ fontWeight: 500 }}>連線已斷開</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default TcpTeardownDemo
