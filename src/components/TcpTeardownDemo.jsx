import React, { useState, useEffect, useRef } from 'react'
import { Play, Pause, RotateCcw, WifiOff } from 'lucide-react'
import { ProtocolAnimationController } from '../lib/ProtocolAnimationController'
import TimelineControl from './TimelineControl'

const TcpTeardownDemo = () => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [renderState, setRenderState] = useState(null)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const controllerRef = useRef(null)
  const rafRef = useRef(null)
  const lastTickRef = useRef(performance.now())

  useEffect(() => {
    // 創建 TCP 四次揮手動畫控制器
    const controller = ProtocolAnimationController.createTcpTeardown(
      'demo-tcp-teardown-192.168.1.100-80-192.168.1.200-12345',
      {
        onStageEnter: (stage) => {
          console.log('進入階段:', stage)
        },
        onComplete: () => {
          console.log('TCP 四次揮手完成')
          setIsPlaying(false)
        }
      }
    )

    controllerRef.current = controller
    controller.reset()
    controller.setPlaybackSpeed(playbackSpeed)
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
  }, [isPlaying])

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
      controllerRef.current.setPlaybackSpeed(playbackSpeed)
      setRenderState(controllerRef.current.getRenderableState())
    }
  }

  const handleSeek = (progressRatio) => {
    if (controllerRef.current) {
      controllerRef.current.seekToProgress(progressRatio)
      setRenderState(controllerRef.current.getRenderableState())
    }
  }

  const handleSpeedChange = (nextSpeed) => {
    setPlaybackSpeed(nextSpeed)
    if (controllerRef.current) {
      controllerRef.current.setPlaybackSpeed(nextSpeed)
    }
  }

  const timelineProgress = renderState?.timelineProgress || 0
  const totalDuration = controllerRef.current?.totalDuration || 100
  const currentTimeValue = timelineProgress * totalDuration
  const currentStage = renderState?.currentStage
  const stageProgress = Math.round(timelineProgress * 100)
  const visualEffects = renderState?.visualEffects || {}

  return (
    <div className="max-w-4xl mx-auto p-6 bg-slate-900 rounded-lg border border-slate-700">
      <div className="flex items-center gap-3 mb-6">
        <WifiOff className="w-6 h-6 text-red-400" />
        <h2 className="text-xl font-semibold text-slate-100">TCP 四次揮手演示</h2>
      </div>

      {/* 動畫視覺化區域 */}
      <div className="bg-slate-800 rounded-lg p-6 mb-6">
        <svg viewBox="0 0 100 40" className="w-full h-32 text-slate-400">
          <defs>
            <filter id="glow-teardown" filterUnits="userSpaceOnUse">
              <feGaussianBlur in="SourceGraphic" stdDeviation="1" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* 客戶端節點 */}
          <circle cx="20" cy="20" r="3" fill="#1f2937" stroke="#ef4444" strokeWidth="0.5" filter="url(#glow-teardown)" />
          <text x="20" y="30" textAnchor="middle" className="text-[3px] fill-slate-200 font-semibold">
            客戶端
          </text>

          {/* 伺服器節點 */}
          <circle cx="80" cy="20" r="3" fill="#1f2937" stroke="#ef4444" strokeWidth="0.5" filter="url(#glow-teardown)" />
          <text x="80" y="30" textAnchor="middle" className="text-[3px] fill-slate-200 font-semibold">
            伺服器
          </text>

          {/* 連接線 */}
          <line
            x1="20"
            y1="20"
            x2="80"
            y2="20"
            stroke={renderState?.protocolColor || '#ef4444'}
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
              fill={renderState.protocolColor || '#ef4444'}
              filter="url(#glow-teardown)"
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

      <TimelineControl
        isPlaying={isPlaying}
        onPlay={handlePlay}
        onPause={handlePause}
        onReset={handleReset}
        progress={timelineProgress}
        onSeek={handleSeek}
        currentTime={currentTimeValue}
        duration={totalDuration}
        playbackSpeed={playbackSpeed}
        onSpeedChange={handleSpeedChange}
        isCompleted={renderState?.isCompleted || false}
        className="mb-4"
        showTimeDisplay={false}
      />

      {/* 控制面板 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={isPlaying ? handlePause : handlePlay}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            disabled={renderState?.isCompleted}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {isPlaying ? '暫停' : '播放'}
          </button>
          
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            重置
          </button>
        </div>

        <div className="text-sm text-slate-400">
          進度: {stageProgress}%
        </div>
      </div>

      {/* 階段資訊 */}
      <div className="bg-slate-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-slate-100 mb-3">當前階段</h3>
        
        {currentStage ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-300">階段:</span>
              <span className="text-red-400 font-medium">{currentStage.label || currentStage.step}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-slate-300">方向:</span>
              <span className="text-slate-400">{currentStage.direction === 'forward' ? '客戶端 → 伺服器' : '伺服器 → 客戶端'}</span>
            </div>
            
            {currentStage.description && (
              <div className="mt-2">
                <span className="text-slate-300">說明:</span>
                <p className="text-slate-400 text-sm mt-1">{currentStage.description}</p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-slate-400">等待開始...</p>
        )}

        {/* 視覺效果指示器 */}
        {Object.keys(visualEffects).some(key => visualEffects[key] && key !== 'opacity' && key !== 'connectionStyle') && (
          <div className="mt-4 pt-3 border-t border-slate-700">
            <span className="text-slate-300 text-sm">視覺效果:</span>
            <div className="flex gap-2 mt-1">
              {visualEffects.blinking && (
                <span className="px-2 py-1 bg-yellow-600/20 text-yellow-400 text-xs rounded">閃爍</span>
              )}
              {visualEffects.pulsing && (
                <span className="px-2 py-1 bg-blue-600/20 text-blue-400 text-xs rounded">脈衝</span>
              )}
              {visualEffects.spinning && (
                <span className="px-2 py-1 bg-purple-600/20 text-purple-400 text-xs rounded">旋轉</span>
              )}
            </div>
          </div>
        )}

        {/* 完成狀態 */}
        {renderState?.isCompleted && (
          <div className="mt-4 pt-3 border-t border-slate-700">
            <div className="flex items-center gap-2 text-red-400">
              <WifiOff className="w-4 h-4" />
              <span className="font-medium">連線已斷開</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default TcpTeardownDemo
