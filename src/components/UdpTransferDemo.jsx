import React, { useState, useEffect, useRef } from 'react'
import { Play, Pause, RotateCcw, Zap, Send, Package } from 'lucide-react'
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
    // 創建 UDP 傳輸動畫控制器
    const controller = ProtocolAnimationController.createUdpTransfer(
      `demo-udp-transfer-192.168.1.100-8080-192.168.1.200-9090-${Date.now()}`,
      {
        onStageEnter: (stage) => {
          console.log('進入階段:', stage)
        },
        onComplete: () => {
          console.log('UDP 傳輸完成')
          setIsPlaying(false)
        }
      }
    )

    controllerRef.current = controller
    controller.reset()
    controller.setPlaybackSpeed(playbackSpeed * getSpeedMultiplier())
    setRenderState(controller.getRenderableState())

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [packetCount, transferSpeed, dataSize])

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
      controllerRef.current.setPlaybackSpeed(playbackSpeed * getSpeedMultiplier())
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
      controllerRef.current.setPlaybackSpeed(nextSpeed * getSpeedMultiplier())
    }
  }

  const getUdpIcon = () => {
    const currentStage = renderState?.currentStage
    if (currentStage?.step === 'Transfer') {
      return <Zap className="w-4 h-4 text-blue-400" />
    } else if (currentStage?.step === 'Send') {
      return <Send className="w-4 h-4 text-green-400" />
    }
    return <Package className="w-4 h-4 text-slate-400" />
  }

  const getTransferColor = () => {
    const currentStage = renderState?.currentStage
    if (currentStage?.step === 'Transfer') return '#60a5fa'
    if (currentStage?.step === 'Send') return '#10b981'
    return '#6b7280'
  }

  const getSpeedMultiplier = () => {
    switch (transferSpeed) {
      case 'slow': return 0.5
      case 'fast': return 2
      case 'very-fast': return 4
      default: return 1
    }
  }

  const timelineProgress = renderState?.timelineProgress || 0
  const totalDuration = controllerRef.current?.totalDuration || 100
  const currentTimeValue = timelineProgress * totalDuration
  const currentStage = renderState?.currentStage
  const stageProgress = Math.round(timelineProgress * 100)
  const visualEffects = renderState?.visualEffects || {}

  // 生成多個數據包的位置
  const generatePacketPositions = () => {
    const packets = []
    const basePosition = renderState?.dotPosition || 0
    const speedMultiplier = getSpeedMultiplier()
    
    for (let i = 0; i < packetCount; i++) {
      const offset = (i * 0.1 * speedMultiplier) % 1
      const position = Math.max(0, Math.min(1, basePosition - offset))
      packets.push({
        id: i,
        position: position,
        opacity: position > 0 ? 1 : 0.3
      })
    }
    
    return packets
  }

  const packets = generatePacketPositions()

  return (
    <div className="max-w-4xl mx-auto p-6 bg-slate-900 rounded-lg border border-slate-700">
      <div className="flex items-center gap-3 mb-6">
        <Zap className="w-6 h-6 text-blue-400" />
        <h2 className="text-xl font-semibold text-slate-100">
          UDP 傳輸視覺化演示
        </h2>
      </div>

      {/* 控制選項 */}
      <div className="bg-slate-800 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">數據包數量</label>
            <select
              value={packetCount}
              onChange={(e) => setPacketCount(parseInt(e.target.value))}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isPlaying}
            >
              <option value={3}>3 個包</option>
              <option value={5}>5 個包</option>
              <option value={10}>10 個包</option>
              <option value={20}>20 個包</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">傳輸速度</label>
            <select
              value={transferSpeed}
              onChange={(e) => setTransferSpeed(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isPlaying}
            >
              <option value="slow">慢速</option>
              <option value="normal">正常</option>
              <option value="fast">快速</option>
              <option value="very-fast">極速</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">數據大小</label>
            <select
              value={dataSize}
              onChange={(e) => setDataSize(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isPlaying}
            >
              <option value="512B">512 字節</option>
              <option value="1KB">1 KB</option>
              <option value="4KB">4 KB</option>
              <option value="64KB">64 KB</option>
            </select>
          </div>
        </div>
      </div>

      {/* 動畫視覺化區域 */}
      <div className="bg-slate-800 rounded-lg p-6 mb-6">
        <svg viewBox="0 0 100 40" className="w-full h-32 text-slate-400">
          <defs>
            <filter id="glow-udp" filterUnits="userSpaceOnUse">
              <feGaussianBlur in="SourceGraphic" stdDeviation="1" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            
            {/* 快速移動效果 */}
            <linearGradient id="speedGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.2" />
              <stop offset="50%" stopColor="#60a5fa" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.2" />
            </linearGradient>
          </defs>

          {/* 發送端節點 */}
          <circle 
            cx="20" 
            cy="20" 
            r="3" 
            fill="#1f2937" 
            stroke={getTransferColor()} 
            strokeWidth="0.5" 
            filter="url(#glow-udp)" 
          />
          <text x="20" y="30" textAnchor="middle" className="text-[3px] fill-slate-200 font-semibold">
            發送端
          </text>

          {/* 接收端節點 */}
          <circle 
            cx="80" 
            cy="20" 
            r="3" 
            fill="#1f2937" 
            stroke={getTransferColor()} 
            strokeWidth="0.5" 
            filter="url(#glow-udp)" 
          />
          <text x="80" y="30" textAnchor="middle" className="text-[3px] fill-slate-200 font-semibold">
            接收端
          </text>

          {/* UDP 虛線連接 */}
          <line
            x1="20"
            y1="20"
            x2="80"
            y2="20"
            stroke={getTransferColor()}
            strokeWidth="1"
            strokeLinecap="round"
            strokeOpacity="0.6"
            strokeDasharray="3,2"
          >
            <animate
              attributeName="stroke-dashoffset"
              values="0;5"
              dur="0.5s"
              repeatCount="indefinite"
            />
          </line>

          {/* 速度軌跡效果 */}
          {currentStage?.step === 'Transfer' && transferSpeed !== 'slow' && (
            <line
              x1="20"
              y1="20"
              x2="80"
              y2="20"
              stroke="url(#speedGradient)"
              strokeWidth="2"
              strokeLinecap="round"
              opacity="0.7"
            >
              <animate
                attributeName="opacity"
                values="0.3;0.7;0.3"
                dur="0.3s"
                repeatCount="indefinite"
              />
            </line>
          )}

          {/* 多個數據包 */}
          {packets.map((packet) => (
            <g key={packet.id}>
              <circle
                cx={20 + (80 - 20) * packet.position}
                cy={20 + (packet.id % 2 === 0 ? -1 : 1) * (packet.id * 0.5)}
                r="1"
                fill={getTransferColor()}
                filter="url(#glow-udp)"
                opacity={packet.opacity}
              >
                {packet.position > 0 && packet.position < 1 && (
                  <animate
                    attributeName="r"
                    values="1;1.5;1"
                    dur="0.2s"
                    repeatCount="indefinite"
                  />
                )}
              </circle>
              
              {/* 數據包軌跡 */}
              {packet.position > 0 && packet.position < 1 && (
                <circle
                  cx={20 + (80 - 20) * Math.max(0, packet.position - 0.05)}
                  cy={20 + (packet.id % 2 === 0 ? -1 : 1) * (packet.id * 0.5)}
                  r="0.5"
                  fill={getTransferColor()}
                  opacity="0.3"
                />
              )}
            </g>
          ))}

          {/* 發送指示器 */}
          {currentStage?.step === 'Send' && (
            <g transform="translate(25, 15)">
              <circle cx="0" cy="0" r="2" fill="#10b981" opacity="0.8">
                <animate
                  attributeName="opacity"
                  values="0.4;0.8;0.4"
                  dur="0.5s"
                  repeatCount="indefinite"
                />
              </circle>
              <text x="0" y="1" textAnchor="middle" className="text-[1.5px] fill-white font-bold">
                →
              </text>
            </g>
          )}

          {/* 接收指示器 */}
          {stageProgress > 50 && (
            <g transform="translate(75, 15)">
              <circle cx="0" cy="0" r="2" fill="#60a5fa" opacity="0.8">
                <animate
                  attributeName="opacity"
                  values="0.4;0.8;0.4"
                  dur="0.3s"
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


      {/* 控制面板 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={isPlaying ? handlePause : handlePlay}
            className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors ${
              currentStage?.step === 'Transfer' 
                ? 'bg-blue-600 hover:bg-blue-700' 
                : currentStage?.step === 'Send'
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-slate-600 hover:bg-slate-700'
            }`}
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
              <div className="flex items-center gap-2">
                {getUdpIcon()}
                <span className={`font-medium ${
                  currentStage.step === 'Transfer' ? 'text-blue-400' :
                  currentStage.step === 'Send' ? 'text-green-400' : 'text-slate-400'
                }`}>
                  {currentStage.label || currentStage.step}
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-slate-300">協議:</span>
              <span className="text-blue-400 font-mono">UDP</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-slate-300">數據包:</span>
              <span className="text-slate-400">{packetCount} 個 ({dataSize})</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-slate-300">傳輸速度:</span>
              <span className="text-slate-400">
                {transferSpeed === 'slow' && '慢速'}
                {transferSpeed === 'normal' && '正常'}
                {transferSpeed === 'fast' && '快速'}
                {transferSpeed === 'very-fast' && '極速'}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-slate-300">狀態:</span>
              <span className="text-slate-400">
                {currentStage.step === 'Send' && '準備發送數據包'}
                {currentStage.step === 'Transfer' && '正在傳輸數據包'}
                {renderState?.isCompleted && '傳輸完成'}
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

        {/* UDP 特性說明 */}
        <div className="mt-4 pt-3 border-t border-slate-700">
          <div className="flex items-center gap-2 p-3 bg-blue-900/20 border border-blue-700/30 rounded-lg">
            <Zap className="w-5 h-5 text-blue-400" />
            <div>
              <p className="font-medium text-blue-400">UDP 協議特性</p>
              <p className="text-blue-300 text-sm">
                無連接、快速傳輸、不保證可靠性，適合即時通訊和串流媒體
              </p>
            </div>
          </div>
        </div>

        {/* 視覺效果指示器 */}
        {Object.keys(visualEffects).some(key => visualEffects[key] && key !== 'opacity' && key !== 'connectionStyle') && (
          <div className="mt-4 pt-3 border-t border-slate-700">
            <span className="text-slate-300 text-sm">視覺效果:</span>
            <div className="flex gap-2 mt-1">
              {visualEffects.fastMovement && (
                <span className="px-2 py-1 bg-blue-600/20 text-blue-400 text-xs rounded">快速移動</span>
              )}
              {visualEffects.multiplePackets && (
                <span className="px-2 py-1 bg-green-600/20 text-green-400 text-xs rounded">多包傳輸</span>
              )}
              {visualEffects.dashedConnection && (
                <span className="px-2 py-1 bg-yellow-600/20 text-yellow-400 text-xs rounded">虛線連接</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default UdpTransferDemo
