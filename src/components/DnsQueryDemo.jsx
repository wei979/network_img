import React, { useState, useEffect, useRef } from 'react'
import { Play, Pause, RotateCcw, Search, Server, CheckCircle, XCircle } from 'lucide-react'
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
    // 創建 DNS 查詢動畫控制器
    const controller = ProtocolAnimationController.createDnsQuery(
      `demo-dns-query-${queryDomain}-${Date.now()}`,
      resolvedIP,
      {
        onStageEnter: (stage) => {
          console.log('進入階段:', stage)
        },
        onComplete: () => {
          console.log('DNS 查詢完成')
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
  }, [queryDomain, resolvedIP])

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

  const getDnsIcon = () => {
    const currentStage = renderState?.currentStage
    if (currentStage?.step === 'Response') {
      return <CheckCircle className="w-4 h-4 text-green-400" />
    } else if (currentStage?.step === 'Query') {
      return <Search className="w-4 h-4 text-blue-400" />
    } else if (currentStage?.step === 'Waiting') {
      return <Server className="w-4 h-4 text-yellow-400" />
    }
    return <Search className="w-4 h-4 text-slate-400" />
  }

  const getQueryColor = () => {
    const currentStage = renderState?.currentStage
    if (currentStage?.step === 'Response') return '#10b981'
    if (currentStage?.step === 'Waiting') return '#f59e0b'
    if (currentStage?.step === 'Query') return '#3b82f6'
    return '#6b7280'
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
        <Search className="w-6 h-6 text-blue-400" />
        <h2 className="text-xl font-semibold text-slate-100">
          DNS 查詢視覺化演示
        </h2>
      </div>

      {/* 控制選項 */}
      <div className="bg-slate-800 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">查詢域名</label>
            <input
              type="text"
              value={queryDomain}
              onChange={(e) => setQueryDomain(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isPlaying}
              placeholder="example.com"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">解析結果 IP</label>
            <input
              type="text"
              value={resolvedIP}
              onChange={(e) => setResolvedIP(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isPlaying}
              placeholder="93.184.216.34"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">查詢類型</label>
            <select
              value={queryType}
              onChange={(e) => setQueryType(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isPlaying}
            >
              <option value="A">A (IPv4)</option>
              <option value="AAAA">AAAA (IPv6)</option>
              <option value="CNAME">CNAME</option>
              <option value="MX">MX</option>
              <option value="TXT">TXT</option>
            </select>
          </div>
        </div>
      </div>

      {/* 動畫視覺化區域 */}
      <div className="bg-slate-800 rounded-lg p-6 mb-6">
        <svg viewBox="0 0 100 40" className="w-full h-32 text-slate-400">
          <defs>
            <filter id="glow-dns" filterUnits="userSpaceOnUse">
              <feGaussianBlur in="SourceGraphic" stdDeviation="1" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            
            {/* 旋轉動畫定義 */}
            <g id="spinner">
              <circle cx="0" cy="0" r="1" fill="none" stroke="#f59e0b" strokeWidth="0.3" strokeDasharray="3,1">
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  values="0;360"
                  dur="1s"
                  repeatCount="indefinite"
                />
              </circle>
            </g>
          </defs>

          {/* 客戶端節點 */}
          <circle 
            cx="20" 
            cy="20" 
            r="3" 
            fill="#1f2937" 
            stroke={getQueryColor()} 
            strokeWidth="0.5" 
            filter="url(#glow-dns)" 
          />
          <text x="20" y="30" textAnchor="middle" className="text-[3px] fill-slate-200 font-semibold">
            客戶端
          </text>

          {/* DNS 伺服器節點 */}
          <circle 
            cx="80" 
            cy="20" 
            r="3" 
            fill="#1f2937" 
            stroke={currentStage?.step === 'Response' ? '#10b981' : getQueryColor()} 
            strokeWidth="0.5" 
            filter="url(#glow-dns)" 
          />
          <text x="80" y="30" textAnchor="middle" className="text-[3px] fill-slate-200 font-semibold">
            DNS 伺服器
          </text>

          {/* 連接線 */}
          <line
            x1="20"
            y1="20"
            x2="80"
            y2="20"
            stroke={getQueryColor()}
            strokeWidth="1"
            strokeLinecap="round"
            strokeOpacity="0.4"
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
              fill={renderState.protocolColor || getQueryColor()}
              filter="url(#glow-dns)"
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

          {/* 等待旋轉圖示 */}
          {currentStage?.step === 'Waiting' && (
            <g transform="translate(80, 20)">
              <use href="#spinner" />
            </g>
          )}

          {/* 查詢圖示 */}
          {currentStage?.step === 'Query' && (
            <g transform="translate(30, 15)">
              <circle cx="0" cy="0" r="2" fill="none" stroke="#3b82f6" strokeWidth="0.3" />
              <text x="0" y="1" textAnchor="middle" className="text-[1.5px] fill-blue-400 font-bold">
                ?
              </text>
            </g>
          )}

          {/* 回應圖示 */}
          {currentStage?.step === 'Response' && (
            <g transform="translate(70, 15)">
              <circle cx="0" cy="0" r="2" fill="#10b981" opacity="0.8">
                <animate
                  attributeName="opacity"
                  values="0.4;0.8;0.4"
                  dur="1s"
                  repeatCount="indefinite"
                />
              </circle>
              <text x="0" y="1" textAnchor="middle" className="text-[1.5px] fill-white font-bold">
                ✓
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
                {getDnsIcon()}
                <span className={`font-medium ${
                  currentStage.step === 'Response' ? 'text-green-400' :
                  currentStage.step === 'Waiting' ? 'text-yellow-400' : 'text-blue-400'
                }`}>
                  {currentStage.label || currentStage.step}
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-slate-300">查詢:</span>
              <span className="text-slate-400 font-mono">
                {queryDomain} ({queryType})
              </span>
            </div>
            
            {currentStage.step === 'Response' && resolvedIP && (
              <div className="flex items-center justify-between">
                <span className="text-slate-300">解析結果:</span>
                <span className="text-green-400 font-mono">{resolvedIP}</span>
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <span className="text-slate-300">狀態:</span>
              <span className="text-slate-400">
                {currentStage.step === 'Query' && '發送 DNS 查詢'}
                {currentStage.step === 'Waiting' && '等待 DNS 伺服器回應'}
                {currentStage.step === 'Response' && '收到 DNS 回應'}
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

        {/* DNS 查詢成功提示 */}
        {currentStage?.step === 'Response' && (
          <div className="mt-4 pt-3 border-t border-slate-700">
            <div className="flex items-center gap-2 p-3 bg-green-900/20 border border-green-700/30 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <div>
                <p className="font-medium text-green-400">DNS 查詢成功</p>
                <p className="text-green-300 text-sm">
                  域名 {queryDomain} 解析為 {resolvedIP}
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
              {visualEffects.spinning && (
                <span className="px-2 py-1 bg-yellow-600/20 text-yellow-400 text-xs rounded">旋轉等待</span>
              )}
              {visualEffects.pulsing && (
                <span className="px-2 py-1 bg-blue-600/20 text-blue-400 text-xs rounded">脈衝查詢</span>
              )}
              {visualEffects.blinking && (
                <span className="px-2 py-1 bg-green-600/20 text-green-400 text-xs rounded">閃爍回應</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default DnsQueryDemo
