import React, { useState, useEffect, useRef } from 'react'
import { Play, Pause, RotateCcw, Globe, Shield, CheckCircle, AlertCircle, XCircle, Settings, Info, ChevronsRight, Clock } from 'lucide-react'
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
    const hooks = { onComplete: () => setIsPlaying(false) };
    const controller = protocolType === 'https-request'
      ? ProtocolAnimationController.createHttpsRequest(
          `demo-${protocolType}-192.168.1.100-80-192.168.1.200-443`,
          statusCode,
          hooks
        )
      : ProtocolAnimationController.createHttpRequest(
          `demo-${protocolType}-192.168.1.100-80-192.168.1.200-443`,
          statusCode,
          hooks
        );

    controllerRef.current = controller
    controller.reset()
    setRenderState(controller.getRenderableState())

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
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
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [isPlaying])

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

  const getStatusIcon = (code) => {
    if (code >= 200 && code < 300) return <CheckCircle className="w-4 h-4 text-green-400" />
    if (code >= 300 && code < 400) return <AlertCircle className="w-4 h-4 text-yellow-400" />
    if (code >= 400) return <XCircle className="w-4 h-4 text-red-400" />
    return <Globe className="w-4 h-4 text-blue-400" />
  }

  const getStatusColor = (code) => {
    if (code >= 200 && code < 300) return '#22c55e'
    if (code >= 300 && code < 400) return '#eab308'
    if (code >= 400) return '#ef4444'
    return '#3b82f6'
  }

  const currentStage = renderState?.currentStage
  const visualEffects = renderState?.visualEffects || {}
  const packetLabel = `${renderState?.protocolType} ${currentStage?.label ?? ''}`.trim()
  const dotProgress = renderState?.dotPosition ?? 0
  const isHttps = protocolType === 'https-request'

  return (
    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left Column: Visualization */}
      <div className="lg:col-span-2 bg-slate-900 rounded-xl border border-slate-800 p-6">
        <div className="flex items-center gap-3 mb-6">
          {isHttps ? <Shield className="w-6 h-6 text-green-400" /> : <Globe className="w-6 h-6 text-blue-400" />}
          <h2 className="text-xl font-semibold text-slate-100">{isHttps ? 'HTTPS' : 'HTTP'} 請求演示</h2>
        </div>
        <div className="aspect-video bg-black/30 rounded-lg p-4 flex items-center justify-center">
          <svg viewBox="0 0 100 40" className="w-full h-full text-slate-400">
            <defs>
              <filter id="glow-http" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="1" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            <g>
              <circle cx="15" cy="20" r="4" fill="#1e293b" stroke={isHttps ? '#22c55e' : '#3b82f6'} strokeWidth="0.7" />
              <text x="15" y="30" textAnchor="middle" className="text-[3px] fill-slate-200 font-semibold">客戶端</text>
            </g>
            <g>
              <circle cx="85" cy="20" r="4" fill="#1e293b" stroke={getStatusColor(statusCode)} strokeWidth="0.7" />
              <text x="85" y="30" textAnchor="middle" className="text-[3px] fill-slate-200 font-semibold">伺服器</text>
            </g>
            <path d="M 19 20 H 81" stroke={renderState?.protocolColor || getStatusColor(statusCode)} strokeWidth="0.5" strokeOpacity="0.6" strokeDasharray={renderState?.connectionStyle === 'dashed' ? '1,1' : 'none'} />
            {renderState && dotProgress > 0 && (
              <g>
                <circle
                  cx={15 + (85 - 15) * dotProgress}
                  cy="20"
                  r={visualEffects.pulsing ? "2" : "1.5"}
                  fill={renderState.protocolColor || getStatusColor(statusCode)}
                  filter="url(#glow-http)"
                  opacity={visualEffects.blinking ? "0.6" : "1"}
                >
                  {visualEffects.pulsing && <animate attributeName="r" values="1.5;2.5;1.5" dur="1s" repeatCount="indefinite" />}
                  {visualEffects.blinking && <animate attributeName="opacity" values="0.6;1;0.6" dur="0.8s" repeatCount="indefinite" />}
                </circle>
                <text x={15 + (85 - 15) * dotProgress} y="15" textAnchor="middle" className="text-[2.5px] fill-white font-bold">{packetLabel}</text>
              </g>
            )}
          </svg>
        </div>
      </div>

      {/* Right Column: Controls & Info */}
      <div className="space-y-6">
        <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-6">
          <h3 className="text-md font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5 text-cyan-400" />
            <span>演示設定</span>
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">協議類型</label>
              <select value={protocolType} onChange={(e) => setProtocolType(e.target.value)} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500" disabled={isPlaying}>
                <option value="http-request">HTTP</option>
                <option value="https-request">HTTPS</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">狀態碼</label>
              <select value={statusCode} onChange={(e) => setStatusCode(parseInt(e.target.value))} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500" disabled={isPlaying}>
                {[200, 201, 301, 302, 400, 401, 404, 500, 503].map(code => <option key={code} value={code}>{code}</option>)}
              </select>
            </div>
          </div>
        </div>

        <TimelineControl
          isPlaying={isPlaying}
          onPlay={handlePlay}
          onPause={handlePause}
          onReset={handleReset}
          progress={renderState?.timelineProgress || 0}
          onSeek={handleSeek}
          currentTime={renderState?.timelineProgress * (renderState?.totalDuration || 0)}
          duration={renderState?.totalDuration || 0}
          playbackSpeed={playbackSpeed}
          onSpeedChange={setPlaybackSpeed}
          isCompleted={renderState?.isCompleted || false}
        />
        
        {currentStage && (
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
            <h3 className="text-md font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <Info className="w-5 h-5 text-cyan-400" />
              <span>當前階段資訊</span>
            </h3>
            <dl className="space-y-3 text-sm text-slate-400">
              <div className="flex justify-between">
                <dt>階段</dt>
                <dd className="text-slate-200 font-medium">{currentStage.label || currentStage.step}</dd>
              </div>
              <div className="flex justify-between items-center">
                <dt>方向</dt>
                <dd className="text-slate-200 font-medium flex items-center gap-2">
                  <span>{currentStage.direction.split('->')[0]}</span>
                  <ChevronsRight className="w-4 h-4 text-slate-500" />
                  <span>{currentStage.direction.split('->')[1]}</span>
                </dd>
              </div>
               {currentStage.duration && <div className="flex justify-between">
                <dt>持續時間</dt>
                <dd className="text-slate-200 font-medium flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-500" />
                  <span>{currentStage.duration}ms</span>
                </dd>
              </div>}
              {currentStage.description && (
                <div className="text-left">
                  <dt className="mb-1">描述</dt>
                  <dd className="text-slate-300 text-xs bg-slate-900/50 p-2 rounded-md border border-slate-700">{currentStage.description}</dd>
                </div>
              )}
               {renderState?.isCompleted && (
                <div className="flex justify-between items-center pt-2 border-t border-slate-700/50">
                    <dt>最終狀態</dt>
                    <dd className="flex items-center gap-2 font-medium" style={{ color: getStatusColor(statusCode) }}>
                        {getStatusIcon(statusCode)}
                        <span>HTTP {statusCode}</span>
                    </dd>
                </div>
               )}
            </dl>
          </div>
        )}
      </div>
    </div>
  )
}

export default HttpRequestDemo