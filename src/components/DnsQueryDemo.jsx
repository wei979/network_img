import React, { useState, useEffect, useRef } from 'react'
import { Play, Pause, RotateCcw, Search, Server, CheckCircle, XCircle, Settings, Info, ChevronsRight, Clock } from 'lucide-react'
import { ProtocolAnimationController } from '../lib/ProtocolAnimationController'
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
    const controller = ProtocolAnimationController.createDnsQuery(
      `demo-dns-query-${queryDomain}-${Date.now()}`,
      resolvedIP,
      { onComplete: () => setIsPlaying(false) }
    )

    controllerRef.current = controller
    controller.reset()
    setRenderState(controller.getRenderableState())

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [queryDomain, resolvedIP, queryType])

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
  const packetLabel = `${queryType} ${queryDomain}?`.trim()
  const dotProgress = renderState?.dotPosition ?? 0

  const getQueryColor = (stage) => {
    if (stage?.step === 'Response') return '#10b981'
    if (stage?.step === 'Waiting') return '#f59e0b'
    return '#3b82f6'
  }
  const connectionColor = getQueryColor(currentStage)

  return (
    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left Column: Visualization */}
      <div className="lg:col-span-2 bg-slate-900 rounded-xl border border-slate-800 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Search className="w-6 h-6 text-blue-400" />
          <h2 className="text-xl font-semibold text-slate-100">DNS 查詢演示</h2>
        </div>
        <div className="aspect-video bg-black/30 rounded-lg p-4 flex items-center justify-center">
          <svg viewBox="0 0 100 40" className="w-full h-full text-slate-400">
            <defs>
              <filter id="glow-dns" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="1" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            <g>
              <circle cx="15" cy="20" r="4" fill="#1e293b" stroke={connectionColor} strokeWidth="0.7" />
              <text x="15" y="30" textAnchor="middle" className="text-[3px] fill-slate-200 font-semibold">客戶端</text>
            </g>
            <g>
              <circle cx="85" cy="20" r="4" fill="#1e293b" stroke={connectionColor} strokeWidth="0.7" />
              <text x="85" y="30" textAnchor="middle" className="text-[3px] fill-slate-200 font-semibold">DNS 伺服器</text>
            </g>
            <path d="M 19 20 H 81" stroke={connectionColor} strokeWidth="0.5" strokeOpacity="0.6" strokeDasharray={currentStage?.step === 'Waiting' ? '1,1' : 'none'} />
            {renderState && dotProgress > 0 && (
              <g>
                <circle cx={15 + (85 - 15) * dotProgress} cy="20" r={visualEffects.pulsing ? "2" : "1.5"} fill={connectionColor} filter="url(#glow-dns)" opacity={visualEffects.blinking ? "0.6" : "1"}>
                  {visualEffects.pulsing && <animate attributeName="r" values="1.5;2.5;1.5" dur="1s" repeatCount="indefinite" />}
                  {visualEffects.blinking && <animate attributeName="opacity" values="0.6;1;0.6" dur="0.8s" repeatCount="indefinite" />}
                </circle>
                <text x={15 + (85 - 15) * dotProgress} y="15" textAnchor="middle" className="text-[2px] fill-white font-bold">{packetLabel}</text>
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
            <span>查詢設定</span>
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">查詢域名</label>
              <input type="text" value={queryDomain} onChange={(e) => setQueryDomain(e.target.value)} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500" disabled={isPlaying} placeholder="example.com"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">解析結果 IP</label>
              <input type="text" value={resolvedIP} onChange={(e) => setResolvedIP(e.target.value)} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500" disabled={isPlaying} placeholder="93.184.216.34"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">查詢類型</label>
              <select value={queryType} onChange={(e) => setQueryType(e.target.value)} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500" disabled={isPlaying}>
                <option value="A">A (IPv4)</option><option value="AAAA">AAAA (IPv6)</option><option value="CNAME">CNAME</option><option value="MX">MX</option><option value="TXT">TXT</option>
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
                <dd className="font-medium flex items-center gap-2" style={{color: connectionColor}}>{currentStage.label || currentStage.step}</dd>
              </div>
               <div className="flex justify-between">
                <dt>查詢</dt>
                <dd className="text-slate-200 font-mono">{queryDomain} ({queryType})</dd>
              </div>
              {currentStage.step === 'Response' && (
                <div className="flex justify-between">
                  <dt>回應</dt>
                  <dd className="text-green-400 font-mono">{resolvedIP}</dd>
                </div>
              )}
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
                <div className="flex justify-between items-center pt-2 border-t border-slate-700/50 text-green-400">
                    <dt>最終狀態</dt>
                    <dd className="flex items-center gap-2 font-medium">
                        <CheckCircle className="w-4 h-4"/>
                        <span>查詢成功</span>
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

export default DnsQueryDemo