import React, { useState, useEffect, useRef } from 'react'
import { Play, Pause, RotateCcw, Globe, Shield, CheckCircle, AlertCircle, XCircle } from 'lucide-react'
import { ProtocolAnimationController } from '../lib/ProtocolAnimationController'
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
    // 創建 HTTP/HTTPS 請求動畫控制器
    const controller = protocolType === 'https-request'
      ? ProtocolAnimationController.createHttpsRequest(
          `demo-${protocolType}-192.168.1.100-80-192.168.1.200-443`,
          statusCode,
          {
            onStageEnter: (stage) => {
              console.log('進入階段:', stage)
            },
            onComplete: () => {
              console.log(`${protocolType.toUpperCase()} 請求完成`)
              setIsPlaying(false)
            }
          }
        )
      : ProtocolAnimationController.createHttpRequest(
          `demo-${protocolType}-192.168.1.100-80-192.168.1.200-443`,
          statusCode,
          {
            onStageEnter: (stage) => {
              console.log('進入階段:', stage)
            },
            onComplete: () => {
              console.log(`${protocolType.toUpperCase()} 請求完成`)
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
  }, [protocolType, statusCode])

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

  const getStatusIcon = () => {
    if (statusCode >= 200 && statusCode < 300) {
      return <CheckCircle className="w-4 h-4 text-green-400" />
    } else if (statusCode >= 300 && statusCode < 400) {
      return <AlertCircle className="w-4 h-4 text-yellow-400" />
    } else if (statusCode >= 400) {
      return <XCircle className="w-4 h-4 text-red-400" />
    }
    return <Globe className="w-4 h-4 text-blue-400" />
  }

  const getStatusColor = () => {
    if (statusCode >= 200 && statusCode < 300) return '#22c55e'
    if (statusCode >= 300 && statusCode < 400) return '#eab308'
    if (statusCode >= 400) return '#ef4444'
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
        {protocolType === 'https-request' ? (
          <Shield className="w-6 h-6 text-green-400" />
        ) : (
          <Globe className="w-6 h-6 text-blue-400" />
        )}
        <h2 className="text-xl font-semibold text-slate-100">
          {protocolType === 'https-request' ? 'HTTPS' : 'HTTP'} 請求演示
        </h2>
      </div>

      {/* 控制選項 */}
      <div className="bg-slate-800 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">協議類型</label>
            <select
              value={protocolType}
              onChange={(e) => setProtocolType(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isPlaying}
            >
              <option value="http-request">HTTP</option>
              <option value="https-request">HTTPS</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">狀態碼</label>
            <select
              value={statusCode}
              onChange={(e) => setStatusCode(parseInt(e.target.value))}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isPlaying}
            >
              <option value={200}>200 OK</option>
              <option value={201}>201 Created</option>
              <option value={301}>301 Moved Permanently</option>
              <option value={302}>302 Found</option>
              <option value={400}>400 Bad Request</option>
              <option value={401}>401 Unauthorized</option>
              <option value={404}>404 Not Found</option>
              <option value={500}>500 Internal Server Error</option>
              <option value={503}>503 Service Unavailable</option>
            </select>
          </div>
        </div>
      </div>

      {/* 動畫視覺化區域 */}
      <div className="bg-slate-800 rounded-lg p-6 mb-6">
        <svg viewBox="0 0 100 40" className="w-full h-32 text-slate-400">
          <defs>
            <filter id="glow-http" filterUnits="userSpaceOnUse">
              <feGaussianBlur in="SourceGraphic" stdDeviation="1" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* 客戶端節點 */}
          <circle 
            cx="20" 
            cy="20" 
            r="3" 
            fill="#1f2937" 
            stroke={protocolType === 'https-request' ? '#22c55e' : '#3b82f6'} 
            strokeWidth="0.5" 
            filter="url(#glow-http)" 
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
            stroke={getStatusColor()} 
            strokeWidth="0.5" 
            filter="url(#glow-http)" 
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
            stroke={renderState?.protocolColor || (protocolType === 'https-request' ? '#22c55e' : '#3b82f6')}
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
              fill={renderState.protocolColor || (protocolType === 'https-request' ? '#22c55e' : '#3b82f6')}
              filter="url(#glow-http)"
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


      {/* 階段資訊 */}
      <div className="bg-slate-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-slate-100 mb-3">當前階段</h3>
        
        {currentStage ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-300">階段:</span>
              <span className={`font-medium ${
                protocolType === 'https-request' ? 'text-green-400' : 'text-blue-400'
              }`}>
                {currentStage.label || currentStage.step}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-slate-300">方向:</span>
              <span className="text-slate-400">
                {currentStage.direction === 'forward' ? '客戶端 → 伺服器' : '伺服器 → 客戶端'}
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

        {/* 狀態碼顯示 */}
        {renderState?.isCompleted && (
          <div className="mt-4 pt-3 border-t border-slate-700">
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <span className="font-medium" style={{ color: getStatusColor() }}>
                HTTP {statusCode}
              </span>
              <span className="text-slate-400 text-sm">
                {statusCode >= 200 && statusCode < 300 && '成功'}
                {statusCode >= 300 && statusCode < 400 && '重定向'}
                {statusCode >= 400 && statusCode < 500 && '客戶端錯誤'}
                {statusCode >= 500 && '伺服器錯誤'}
              </span>
            </div>
          </div>
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
      </div>
    </div>
  )
}

export default HttpRequestDemo
