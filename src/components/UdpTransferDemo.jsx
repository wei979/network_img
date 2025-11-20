import React, { useState, useEffect, useRef } from 'react'
import { Play, Pause, RotateCcw, Zap, Send, Package, Settings, Info, ChevronsRight, Clock } from 'lucide-react'
import { ProtocolAnimationController } from '../lib/ProtocolAnimationController'
import TimelineControl from './TimelineControl'

const UdpTransferDemo = () => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [renderState, setRenderState] = useState(null)
  const [packetCount, setPacketCount] = useState(5)
  const [transferSpeed, setTransferSpeed] = useState('normal')
  const [dataSize, setDataSize] = useState('1KB')
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const controllerRef = useRef(null)
  const rafRef = useRef(null)
  const lastTickRef = useRef(performance.now())

  useEffect(() => {
    const controller = ProtocolAnimationController.createUdpTransfer(
      `demo-udp-transfer-${Date.now()}`,
      { onComplete: () => setIsPlaying(false) }
    )
    controllerRef.current = controller
    controller.reset()
    setRenderState(controller.getRenderableState())
  }, [packetCount, transferSpeed, dataSize])

  useEffect(() => {
    if (!isPlaying || !controllerRef.current) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
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
      controllerRef.current.setPlaybackSpeed(playbackSpeed * getSpeedMultiplier())
    }
  }, [playbackSpeed, transferSpeed])
  
  const getSpeedMultiplier = () => {
    if(transferSpeed === 'slow') return 0.5
    if(transferSpeed === 'fast') return 2
    if(transferSpeed === 'very-fast') return 4
    return 1
  }

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
  const dotProgress = renderState?.dotPosition ?? 0

  const packets = Array.from({ length: packetCount }).map((_, i) => ({
    id: i,
    position: (dotProgress + (i / packetCount)) % 1,
    opacity: dotProgress > (i / packetCount) ? 0 : 1,
  }));

  return (
    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 bg-slate-900 rounded-xl border border-slate-800 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Zap className="w-6 h-6 text-blue-400" />
          <h2 className="text-xl font-semibold text-slate-100">UDP 傳輸演示</h2>
        </div>
        <div className="aspect-video bg-black/30 rounded-lg p-4 flex items-center justify-center">
          <svg viewBox="0 0 100 40" className="w-full h-full text-slate-400">
            <defs>
              <filter id="glow-udp" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="1" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            <g>
              <circle cx="15" cy="20" r="4" fill="#1e293b" stroke="#60a5fa" strokeWidth="0.7" />
              <text x="15" y="30" textAnchor="middle" className="text-[3px] fill-slate-200 font-semibold">發送端</text>
            </g>
            <g>
              <circle cx="85" cy="20" r="4" fill="#1e293b" stroke="#60a5fa" strokeWidth="0.7" />
              <text x="85" y="30" textAnchor="middle" className="text-[3px] fill-slate-200 font-semibold">接收端</text>
            </g>
            <path d="M 19 20 H 81" stroke="#60a5fa" strokeWidth="0.5" strokeOpacity="0.4" strokeDasharray="2,2" />
            {packets.map(p => (
              p.position > 0 && p.position < 1 &&
              <circle key={p.id} cx={15 + (85 - 15) * p.position} cy={20} r="1.2" fill="#60a5fa" filter="url(#glow-udp)" opacity={p.opacity} />
            ))}
          </svg>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-6">
          <h3 className="text-md font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5 text-cyan-400" />
            <span>傳輸設定</span>
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">數據包數量</label>
              <select value={packetCount} onChange={(e) => setPacketCount(parseInt(e.target.value))} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500" disabled={isPlaying}>
                {[3, 5, 10, 20].map(c => <option key={c} value={c}>{c} 個包</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">傳輸速度</label>
               <select value={transferSpeed} onChange={(e) => setTransferSpeed(e.target.value)} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500" disabled={isPlaying}>
                <option value="slow">慢速</option><option value="normal">正常</option><option value="fast">快速</option><option value="very-fast">極速</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">數據大小</label>
              <select value={dataSize} onChange={(e) => setDataSize(e.target.value)} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500" disabled={isPlaying}>
                {['512B', '1KB', '4KB', '64KB'].map(s => <option key={s} value={s}>{s}</option>)}
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
              <span>傳輸資訊</span>
            </h3>
            <dl className="space-y-3 text-sm text-slate-400">
              <div className="flex justify-between"><dt>狀態</dt><dd className="text-slate-200 font-medium">{renderState?.isCompleted ? '已完成' : '傳輸中'}</dd></div>
              <div className="flex justify-between"><dt>數據包</dt><dd className="text-slate-200 font-medium">{packetCount} 個 ({dataSize})</dd></div>
              <div className="flex justify-between"><dt>速度</dt><dd className="text-slate-200 font-medium">{transferSpeed}</dd></div>
              {currentStage.description && (
                <div className="text-left"><dt className="mb-1">描述</dt><dd className="text-slate-300 text-xs bg-slate-900/50 p-2 rounded-md border border-slate-700">{currentStage.description}</dd></div>
              )}
            </dl>
          </div>
        )}
      </div>
    </div>
  )
}

export default UdpTransferDemo