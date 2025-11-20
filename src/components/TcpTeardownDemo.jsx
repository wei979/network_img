import React, { useState, useEffect, useRef } from 'react'
import { Play, Pause, RotateCcw, WifiOff, Info, Clock, ChevronsRight } from 'lucide-react'
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
    const controller = ProtocolAnimationController.createTcpTeardown(
      'demo-tcp-teardown-192.168.1.100-80-192.168.1.200-12345',
      {
        onComplete: () => setIsPlaying(false)
      }
    )

    controllerRef.current = controller
    controller.reset()
    setRenderState(controller.getRenderableState())

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
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

  const currentStage = renderState?.currentStage
  const visualEffects = renderState?.visualEffects || {}
  const packetLabel = `${renderState?.protocolType} ${currentStage?.label ?? ''}`.trim()
  const dotProgress = renderState?.dotPosition ?? 0

  return (
    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left Column: Visualization */}
      <div className="lg:col-span-2 bg-slate-900 rounded-xl border border-slate-800 p-6">
        <div className="flex items-center gap-3 mb-6">
          <WifiOff className="w-6 h-6 text-red-400" />
          <h2 className="text-xl font-semibold text-slate-100">TCP 四次揮手演示</h2>
        </div>
        <div className="aspect-video bg-black/30 rounded-lg p-4 flex items-center justify-center">
          <svg viewBox="0 0 100 40" className="w-full h-full text-slate-400">
            <defs>
              <filter id="glow-teardown" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="1" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Client & Server Nodes */}
            <g>
              <circle cx="15" cy="20" r="4" fill="#1e293b" stroke="#f43f5e" strokeWidth="0.7" />
              <text x="15" y="30" textAnchor="middle" className="text-[3px] fill-slate-200 font-semibold">客戶端</text>
            </g>
            <g>
              <circle cx="85" cy="20" r="4" fill="#1e293b" stroke="#f43f5e" strokeWidth="0.7" />
              <text x="85" y="30" textAnchor="middle" className="text-[3px] fill-slate-200 font-semibold">伺服器</text>
            </g>
            
            {/* Connection Line */}
            <path d="M 19 20 H 81" stroke={renderState?.protocolColor || '#f43f5e'} strokeWidth="0.5" strokeOpacity="0.6" strokeDasharray={renderState?.connectionStyle === 'dashed' ? '1,1' : 'none'} />

            {/* Animated Packet */}
            {renderState && dotProgress > 0 && (
              <g>
                <circle
                  cx={15 + (85 - 15) * dotProgress}
                  cy="20"
                  r={visualEffects.pulsing ? "2" : "1.5"}
                  fill={renderState.protocolColor || '#f43f5e'}
                  filter="url(#glow-teardown)"
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
      <div className="space-y-6 bg-slate-900/80 rounded-xl border border-slate-800 p-6">
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
              <div className="flex justify-between">
                <dt>持續時間</dt>
                <dd className="text-slate-200 font-medium flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-500" />
                  <span>{currentStage.duration}ms</span>
                </dd>
              </div>
              {currentStage.description && (
                <div className="text-left">
                  <dt className="mb-1">描述</dt>
                  <dd className="text-slate-300 text-xs bg-slate-900/50 p-2 rounded-md border border-slate-700">{currentStage.description}</dd>
                </div>
              )}
            </dl>
          </div>
        )}
      </div>
    </div>
  )
}

export default TcpTeardownDemo