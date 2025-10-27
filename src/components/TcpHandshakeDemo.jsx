import React, { useEffect, useRef, useState } from 'react'
import { ProtocolAnimationController } from '../lib/ProtocolAnimationController'
import { Play, Pause, RotateCcw, Wifi } from 'lucide-react'
import TimelineControl from './TimelineControl'

const TcpHandshakeDemo = () => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [renderState, setRenderState] = useState(null)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const controllerRef = useRef(null)
  const rafRef = useRef(null)
  const lastTickRef = useRef(performance.now())

  useEffect(() => {
    // 創建 TCP 握手動畫控制器
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

      // 統一播放速度處理：控制器內部負責縮放
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

  // 當播放速度變更時，更新控制器的速度
  useEffect(() => {
    if (controllerRef.current) {
      controllerRef.current.setPlaybackSpeed(playbackSpeed)
    }
  }, [playbackSpeed])

  const handlePlay = () => {
    setIsPlaying(true)
  }

  const handlePause = () => {
    setIsPlaying(false)
  }

  const handleReset = () => {
    setIsPlaying(false)
    if (controllerRef.current) {
      controllerRef.current.reset()
      setRenderState(controllerRef.current.getRenderableState())
    }
  }

  const handleSeek = (progress) => {
    if (controllerRef.current) {
      // 根据进度设置动画时间
      controllerRef.current.seekToProgress(progress)
      setRenderState(controllerRef.current.getRenderableState())
    }
  }

  const handleSpeedChange = (newSpeed) => {
    setPlaybackSpeed(newSpeed)
    // 立即同步到控制器（即時生效）
    if (controllerRef.current) {
      controllerRef.current.setPlaybackSpeed(newSpeed)
    }
  }

  const currentStage = renderState?.currentStage
  const stageProgress = Math.round((renderState?.timelineProgress || 0) * 100)
  const visualEffects = renderState?.visualEffects || {}

  return (
    <div className="max-w-4xl mx-auto p-6 bg-slate-900 rounded-lg border border-slate-700">
      <div className="flex items-center gap-3 mb-6">
        <Wifi className="w-6 h-6 text-green-400" />
        <h2 className="text-xl font-semibold text-slate-100">TCP 三次握手演示</h2>
      </div>

      {/* 動畫視覺化區域 */}
      <div className="bg-slate-800 rounded-lg p-6 mb-6">
        <svg viewBox="0 0 100 40" className="w-full h-32 text-slate-400">
          <defs>
            <filter id="glow" filterUnits="userSpaceOnUse">
              <feGaussianBlur in="SourceGraphic" stdDeviation="1" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* 客戶端節點 */}
          <circle cx="20" cy="20" r="3" fill="#1f2937" stroke="#22c55e" strokeWidth="0.5" filter="url(#glow)" />
          <text x="20" y="30" textAnchor="middle" className="text-[3px] fill-slate-200 font-semibold">
            客戶端
          </text>

          {/* 伺服器節點 */}
          <circle cx="80" cy="20" r="3" fill="#1f2937" stroke="#22c55e" strokeWidth="0.5" filter="url(#glow)" />
          <text x="80" y="30" textAnchor="middle" className="text-[3px] fill-slate-200 font-semibold">
            伺服器
          </text>

          {/* 連接線 */}
          <line
            x1="20"
            y1="20"
            x2="80"
            y2="20"
            stroke={renderState?.protocolColor || '#22c55e'}
            strokeWidth="1"
            strokeLinecap="round"
            strokeOpacity="0.4"
            strokeDasharray={renderState?.connectionStyle === 'dashed' ? '2,2' : 'none'}
          />

          {/* 動畫圓點 */}
          {renderState && (
            <circle
              cx={20 + (80 - 20) * Math.max(0, Math.min(1, renderState.dotPosition || 0))}
              cy="20"
              r={visualEffects.pulsing ? "2" : "1.5"}
              fill={renderState.protocolColor || '#22c55e'}
              filter="url(#glow)"
              opacity={visualEffects.blinking ? "0.5" : "1"}
            >
              {visualEffects.pulsing && (
                <animate
                  attributeName="r"
                  values="1.5;2.5;1.5"
                  dur="1s"
                  repeatCount="indefinite"
                />
              )}
              {visualEffects.blinking && (
                <animate
                  attributeName="opacity"
                  values="0.3;1;0.3"
                  dur="0.8s"
                  repeatCount="indefinite"
                />
              )}
            </circle>
          )}

          {/* 階段標籤 */}
          {currentStage && (
            <text
              x="50"
              y="12"
              textAnchor="middle"
              className="text-[2.5px] fill-slate-200 font-semibold"
            >
              {currentStage.label || currentStage.step}
            </text>
          )}
        </svg>
      </div>

      {/* 时间轴控制面板 */}
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
        className="mb-4"
      />

      {/* 階段資訊 */}
      {currentStage && (
        <div className="bg-slate-800 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-slate-200 mb-2">當前階段</h3>
          <div className="space-y-2 text-xs text-slate-400">
            <div className="flex justify-between">
              <span>階段:</span>
              <span className="text-slate-200">{currentStage.label || currentStage.step}</span>
            </div>
            <div className="flex justify-between">
              <span>方向:</span>
              <span className="text-slate-200">{currentStage.direction}</span>
            </div>
            <div className="flex justify-between">
              <span>持續時間:</span>
              <span className="text-slate-200">{currentStage.duration}ms</span>
            </div>
            {currentStage.description && (
              <div className="flex justify-between">
                <span>描述:</span>
                <span className="text-slate-200">{currentStage.description}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default TcpHandshakeDemo