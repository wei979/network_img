import React, { useState, useEffect, useRef } from 'react'
import { Play, Pause, RotateCcw, AlertTriangle, Clock, Wifi, WifiOff } from 'lucide-react'
import { ProtocolAnimationController } from '../lib/ProtocolAnimationController'
import TimelineControl from './TimelineControl'

const TimeoutDemo = () => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [renderState, setRenderState] = useState(null)
  const [timeoutDuration, setTimeoutDuration] = useState(3000)
  const [protocolType, setProtocolType] = useState('tcp')
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const controllerRef = useRef(null)
  const rafRef = useRef(null)
  const lastTickRef = useRef(performance.now())

  useEffect(() => {
    // 建立連線逾時動畫控制器
    const controller = ProtocolAnimationController.createTimeout(
      `demo-timeout-${protocolType}-192.168.1.100-80-192.168.1.200-443`,
      {
        onStageEnter: (stage) => {
          console.log('進入階段:', stage)
        },
        onComplete: () => {
          console.log('連線逾時完成')
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
  }, [timeoutDuration, protocolType])

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

  const getTimeoutIcon = () => {
    const currentStage = renderState?.currentStage
    if (currentStage?.step === 'Timeout') {
      return <AlertTriangle className="w-4 h-4 text-red-400" />
    } else if (currentStage?.step === 'Waiting') {
      return <Clock className="w-4 h-4 text-yellow-400" />
    }
    return <Wifi className="w-4 h-4 text-blue-400" />
  }

  const getConnectionColor = () => {
    const currentStage = renderState?.currentStage
    if (currentStage?.step === 'Timeout') return '#ef4444'
    if (currentStage?.step === 'Waiting') return '#f59e0b'
    return '#3b82f6'
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
        <AlertTriangle className="w-6 h-6 text-yellow-400" />
        <h2 className="text-xl font-semibold text-slate-100">
          連線逾時視覺化演示
        </h2>
      </div>

      {/* 控制選項 */}
      <div className="bg-slate-800 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">通訊協定類型</label>
            <select
              value={protocolType}
              onChange={(e) => setProtocolType(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isPlaying}
            >
              <option value="tcp">TCP</option>
              <option value="http">HTTP</option>
              <option value="https">HTTPS</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">逾時時間 (毫秒)</label>
            <select
              value={timeoutDuration}
              onChange={(e) => setTimeoutDuration(parseInt(e.target.value))}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isPlaying}
            >
              <option value={1000}>1 秒</option>
              <option value={3000}>3 秒</option>
              <option value={5000}>5 秒</option>
              <option value={10000}>10 秒</option>
            </select>
          </div>
        </div>
      </div>

      {/* 動畫視覺化區域 */}
      <div className="bg-slate-800 rounded-lg p-6 mb-6">
        <svg viewBox="0 0 100 40" className="w-full h-32 text-slate-400">
          <defs>
            <filter id="glow-timeout" filterUnits="userSpaceOnUse">
              <feGaussianBlur in="SourceGraphic" stdDeviation="1" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            
            {/* 漸變定義 */}
            <linearGradient id="timeoutGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
          </defs>

          {/* 客戶端節點 */}
          <circle 
            cx="20" 
            cy="20" 
            r="3" 
            fill="#1f2937" 
            stroke={getConnectionColor()} 
            strokeWidth="0.5" 
            filter="url(#glow-timeout)" 
          />
          <text x="20" y="30" textAnchor="middle" className="text-[3px] fill-slate-200 font-semibold">
            客戶端
          </text>

          {/* 伺服器節點 */}
          <circle 
            cx="80" 
            cy="20" 
            r="3" 
            fill="#1f2937" 
            stroke={currentStage?.step === 'Timeout' ? '#6b7280' : getConnectionColor()} 
            strokeWidth="0.5" 
            filter="url(#glow-timeout)" 
            opacity={currentStage?.step === 'Timeout' ? '0.5' : '1'}
          />
          <text x="80" y="30" textAnchor="middle" className="text-[3px] fill-slate-200 font-semibold">
            伺服器
          </text>

          {/* 連接線 */}
          <line
            x1="20"
            y1="20"
            x2="80"
            y2="20"
            stroke={currentStage?.step === 'Timeout' ? 'url(#timeoutGradient)' : getConnectionColor()}
            strokeWidth="1"
            strokeLinecap="round"
            strokeOpacity={currentStage?.step === 'Timeout' ? '0.6' : '0.4'}
            strokeDasharray={currentStage?.step === 'Waiting' ? '2,2' : 'none'}
          >
            {currentStage?.step === 'Waiting' && (
              <animate
                attributeName="stroke-dashoffset"
                values="0;4"
                dur="1s"
                repeatCount="indefinite"
              />
            )}
          </line>

          {/* 動畫圓點 */}
          {renderState && (
            <circle
              cx={20 + (80 - 20) * Math.max(0, Math.min(1, renderState.dotPosition || 0))}
              cy="20"
              r={visualEffects.pulsing ? "2" : "1.5"}
              fill={renderState.protocolColor || getConnectionColor()}
              filter="url(#glow-timeout)"
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
                  dur="0.5s"
                  repeatCount="indefinite"
                />
              )}
            </circle>
          )}

          {/* 警告圖示 (逾時時顯示) */}
          {currentStage?.step === 'Timeout' && (
            <g transform="translate(50, 10)">
              <circle cx="0" cy="0" r="4" fill="#ef4444" opacity="0.8">
                <animate
                  attributeName="opacity"
                  values="0.4;0.8;0.4"
                  dur="1s"
                  repeatCount="indefinite"
                />
              </circle>
              <text x="0" y="1" textAnchor="middle" className="text-[2px] fill-white font-bold">
                ⚠
              </text>
            </g>
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



      {/* 階段資訊 */}
      <div className="bg-slate-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-slate-100 mb-3">當前階段</h3>
        
        {currentStage ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-300">階段:</span>
              <div className="flex items-center gap-2">
                {getTimeoutIcon()}
                <span className={`font-medium ${
                  currentStage.step === 'Timeout' ? 'text-red-400' :
                  currentStage.step === 'Waiting' ? 'text-yellow-400' : 'text-blue-400'
                }`}>
                  {currentStage.label || currentStage.step}
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-slate-300">狀態:</span>
              <span className="text-slate-400">
                {currentStage.step === 'Request' && '發送請求'}
                {currentStage.step === 'Waiting' && '等待回應中...'}
                {currentStage.step === 'Timeout' && '連線已超時'}
              </span>
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

        {/* 逾時警告 */}
        {currentStage?.step === 'Timeout' && (
          <div className="mt-4 pt-3 border-t border-slate-700">
            <div className="flex items-center gap-2 p-3 bg-red-900/20 border border-red-700/30 rounded-lg">
              <WifiOff className="w-5 h-5 text-red-400" />
              <div>
                <p className="font-medium text-red-400">連線逾時</p>
                <p className="text-red-300 text-sm">
                  伺服器在 {timeoutDuration/1000} 秒內未回應，連線已中斷
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 視覺效果指示器 */}
        {Object.keys(visualEffects).some(key => visualEffects[key] && key !== 'opacity' && key !== 'connectionStyle') && (
          <div className="mt-4 pt-3 border-t border-slate-700">
            <span className="text-slate-300 text-sm">視覺效果:</span>
            <div className="flex gap-2 mt-1">
              {visualEffects.blinking && (
                <span className="px-2 py-1 bg-red-600/20 text-red-400 text-xs rounded">閃爍警告</span>
              )}
              {visualEffects.pulsing && (
                <span className="px-2 py-1 bg-yellow-600/20 text-yellow-400 text-xs rounded">脈衝等待</span>
              )}
              {visualEffects.spinning && (
                <span className="px-2 py-1 bg-blue-600/20 text-blue-400 text-xs rounded">旋轉</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default TimeoutDemo
