import React, { useEffect, useRef, useState } from 'react'
import { ProtocolAnimationController } from '../lib/ProtocolAnimationController'
import { Play, Pause, RotateCcw, Wifi } from 'lucide-react'
import { S } from '../lib/swiss-tokens'
import TimelineControl from './TimelineControl'

const TcpHandshakeDemo = () => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [renderState, setRenderState] = useState(null)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const controllerRef = useRef(null)
  const rafRef = useRef(null)
  const lastTickRef = useRef(performance.now())

  useEffect(() => {
    const controller = ProtocolAnimationController.createTcpHandshake(
      'demo-tcp-handshake-192.168.1.100-80-192.168.1.200-12345',
      {
        onStageEnter: (stage) => {
          console.log('進入階段:', stage)
        },
        onComplete: () => {
          console.log('TCP 握手完成')
          setIsPlaying(false)
        }
      }
    )

    controllerRef.current = controller
    controller.reset()
    setRenderState(controller.getRenderableState())

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!isPlaying || !controllerRef.current) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      return
    }

    lastTickRef.current = performance.now()

    const tick = (timestamp) => {
      const delta = timestamp - lastTickRef.current
      lastTickRef.current = timestamp

      controllerRef.current.advance(delta)
      const newState = controllerRef.current.getRenderableState()
      setRenderState(newState)

      if (isPlaying && !newState.isCompleted) {
        rafRef.current = requestAnimationFrame(tick)
      } else if (newState.isCompleted) {
        setIsPlaying(false)
      }
    }

    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [isPlaying, playbackSpeed])

  useEffect(() => {
    if (controllerRef.current) {
      controllerRef.current.setPlaybackSpeed(playbackSpeed)
    }
  }, [playbackSpeed])

  const handlePlay = () => setIsPlaying(true)
  const handlePause = () => setIsPlaying(false)

  const handleReset = () => {
    setIsPlaying(false)
    if (controllerRef.current) {
      controllerRef.current.reset()
      setRenderState(controllerRef.current.getRenderableState())
    }
  }

  const handleSeek = (progress) => {
    if (controllerRef.current) {
      controllerRef.current.seekToProgress(progress)
      setRenderState(controllerRef.current.getRenderableState())
    }
  }

  const handleSpeedChange = (newSpeed) => {
    setPlaybackSpeed(newSpeed)
    if (controllerRef.current) {
      controllerRef.current.setPlaybackSpeed(newSpeed)
    }
  }

  const currentStage = renderState?.currentStage
  const stageProgress = Math.round((renderState?.timelineProgress || 0) * 100)
  const visualEffects = renderState?.visualEffects || {}

  return (
    <div style={{ maxWidth: '56rem', margin: '0 auto', padding: 24, background: S.bg, borderRadius: S.radius.md, border: `1px solid ${S.border}`, fontFamily: S.font.sans }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Wifi size={24} style={{ color: S.protocol.HTTP }} />
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: S.text.primary, margin: 0 }}>TCP 三次握手演示</h2>
      </div>

      {/* 動畫視覺化區域 */}
      <div style={{ background: S.surface, borderRadius: S.radius.sm, padding: 24, marginBottom: 24 }}>
        <svg viewBox="0 0 100 40" style={{ width: '100%', height: '8rem' }}>
          {/* 客戶端節點 */}
          <circle cx="20" cy="20" r="3" fill={S.bg} stroke={S.protocol.TCP} strokeWidth="0.5" />
          <text x="20" y="30" textAnchor="middle" fill={S.text.primary} fontSize="3" fontWeight="600" fontFamily={S.font.sans}>
            客戶端
          </text>

          {/* 伺服器節點 */}
          <circle cx="80" cy="20" r="3" fill={S.bg} stroke={S.protocol.TCP} strokeWidth="0.5" />
          <text x="80" y="30" textAnchor="middle" fill={S.text.primary} fontSize="3" fontWeight="600" fontFamily={S.font.sans}>
            伺服器
          </text>

          {/* 連接線 */}
          <line
            x1="20" y1="20" x2="80" y2="20"
            stroke={renderState?.protocolColor || S.protocol.TCP}
            strokeWidth="1" strokeLinecap="round" strokeOpacity="0.4"
            strokeDasharray={renderState?.connectionStyle === 'dashed' ? '2,2' : 'none'}
          />

          {/* 動畫圓點 */}
          {renderState && (
            <circle
              cx={20 + (80 - 20) * Math.max(0, Math.min(1, renderState.dotPosition || 0))}
              cy="20"
              r={visualEffects.pulsing ? "2" : "1.5"}
              fill={renderState.protocolColor || S.protocol.TCP}
              opacity={visualEffects.blinking ? "0.5" : "1"}
            >
              {visualEffects.pulsing && (
                <animate attributeName="r" values="1.5;2.5;1.5" dur="1s" repeatCount="indefinite" />
              )}
              {visualEffects.blinking && (
                <animate attributeName="opacity" values="0.3;1;0.3" dur="0.8s" repeatCount="indefinite" />
              )}
            </circle>
          )}

          {/* 階段標籤 */}
          {currentStage && (
            <text x="50" y="12" textAnchor="middle" fill={S.text.primary} fontSize="2.5" fontWeight="600">
              {currentStage.label || currentStage.step}
            </text>
          )}
        </svg>
      </div>

      {/* 時間軸控制面板 */}
      <TimelineControl
        isPlaying={isPlaying}
        onPlay={handlePlay}
        onPause={handlePause}
        onReset={handleReset}
        progress={renderState?.timelineProgress || 0}
        onSeek={handleSeek}
        currentTime={stageProgress}
        duration={100}
        playbackSpeed={playbackSpeed}
        onSpeedChange={handleSpeedChange}
        isCompleted={renderState?.isCompleted || false}
        wrapperStyle={{ marginBottom: 16 }}
      />

      {/* 階段資訊 */}
      {currentStage && (
        <div style={{ background: S.surface, borderRadius: S.radius.sm, padding: 16, marginTop: 16 }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: S.text.primary, marginBottom: 8, marginTop: 0 }}>當前階段</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.75rem', color: S.text.secondary }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>階段:</span>
              <span style={{ color: S.text.primary }}>{currentStage.label || currentStage.step}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>方向:</span>
              <span style={{ color: S.text.primary }}>{currentStage.direction}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>持續時間:</span>
              <span style={{ color: S.text.primary }}>{currentStage.duration}ms</span>
            </div>
            {currentStage.description && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>描述:</span>
                <span style={{ color: S.text.primary }}>{currentStage.description}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default TcpHandshakeDemo
