import React from 'react'
import { Play, Pause, SkipBack, SkipForward, Gauge } from 'lucide-react'

/**
 * TimelineControls - 時間軸播放控制元件
 *
 * 提供完整的播放控制介面：
 * - 播放/暫停
 * - 速度調整
 * - 時間軸拖曳
 * - 單步前進/後退
 */
export default function TimelineControls({
  isPlaying,
  speed,
  currentTime,
  totalTime,
  progress,
  packetCount,
  onPlayPause,
  onSpeedChange,
  onSeek,
  onStepForward,
  onStepBackward,
  className = ''
}) {
  // 格式化時間顯示（秒數）
  const formatTime = (seconds) => {
    const sec = parseFloat(seconds)
    if (isNaN(sec)) return '0.00s'
    return `${sec.toFixed(2)}s`
  }

  // 速度選項
  const speedOptions = [0.25, 0.5, 1, 2, 3, 5]

  return (
    <div className={`bg-slate-900/95 border border-slate-700/50 rounded-lg p-3 backdrop-blur-sm shadow-xl ${className}`}>
      {/* 時間資訊 */}
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs text-slate-400 font-mono">
          <span className="text-cyan-400 font-semibold">{formatTime(currentTime)}</span>
          <span className="mx-1">/</span>
          <span>{formatTime(totalTime)}</span>
        </div>
        <div className="text-xs text-slate-400">
          {packetCount} 封包
        </div>
      </div>

      {/* 時間軸拖曳條 */}
      <div className="mb-3">
        <input
          type="range"
          min="0"
          max="100"
          value={progress * 100}
          onChange={(e) => onSeek(parseFloat(e.target.value) / 100)}
          className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer
                     [&::-webkit-slider-thumb]:appearance-none
                     [&::-webkit-slider-thumb]:w-3
                     [&::-webkit-slider-thumb]:h-3
                     [&::-webkit-slider-thumb]:rounded-full
                     [&::-webkit-slider-thumb]:bg-cyan-400
                     [&::-webkit-slider-thumb]:cursor-pointer
                     [&::-webkit-slider-thumb]:shadow-lg
                     [&::-webkit-slider-thumb]:shadow-cyan-500/50
                     [&::-moz-range-thumb]:w-3
                     [&::-moz-range-thumb]:h-3
                     [&::-moz-range-thumb]:rounded-full
                     [&::-moz-range-thumb]:bg-cyan-400
                     [&::-moz-range-thumb]:border-0
                     [&::-moz-range-thumb]:cursor-pointer
                     hover:[&::-webkit-slider-thumb]:bg-cyan-300
                     hover:[&::-moz-range-thumb]:bg-cyan-300"
          style={{
            background: `linear-gradient(to right, rgb(34 211 238) 0%, rgb(34 211 238) ${progress * 100}%, rgb(51 65 85) ${progress * 100}%, rgb(51 65 85) 100%)`
          }}
        />
        <div className="flex justify-between mt-1">
          <div className="text-[10px] text-slate-500">0%</div>
          <div className="text-[10px] text-cyan-400 font-semibold">{Math.round(progress * 100)}%</div>
          <div className="text-[10px] text-slate-500">100%</div>
        </div>
      </div>

      {/* 控制按鈕 */}
      <div className="flex items-center gap-2">
        {/* 單步後退 */}
        <button
          onClick={onStepBackward}
          className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 transition-colors
                     text-slate-300 hover:text-cyan-400"
          title="單步後退"
        >
          <SkipBack className="w-4 h-4" />
        </button>

        {/* 播放/暫停 */}
        <button
          onClick={onPlayPause}
          className="p-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 transition-colors
                     text-white shadow-lg shadow-cyan-600/30"
          title={isPlaying ? '暫停' : '播放'}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5" />
          ) : (
            <Play className="w-5 h-5 ml-0.5" />
          )}
        </button>

        {/* 單步前進 */}
        <button
          onClick={onStepForward}
          className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 transition-colors
                     text-slate-300 hover:text-cyan-400"
          title="單步前進"
        >
          <SkipForward className="w-4 h-4" />
        </button>

        {/* 分隔線 */}
        <div className="w-px h-6 bg-slate-700 mx-1"></div>

        {/* 速度控制 */}
        <div className="flex items-center gap-2 flex-1">
          <Gauge className="w-4 h-4 text-slate-400" />
          <div className="flex items-center gap-1">
            {speedOptions.map(speedValue => (
              <button
                key={speedValue}
                onClick={() => onSpeedChange(speedValue)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  speed === speedValue
                    ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-300'
                }`}
                title={`${speedValue}x 速度`}
              >
                {speedValue}x
              </button>
            ))}
          </div>
        </div>

        {/* 自訂速度滑桿（可選） */}
        <div className="flex items-center gap-2 ml-2">
          <span className="text-xs text-slate-400 font-mono min-w-[3ch]">
            {speed.toFixed(1)}x
          </span>
          <input
            type="range"
            min="0.1"
            max="5"
            step="0.1"
            value={speed}
            onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
            className="w-20 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer
                       [&::-webkit-slider-thumb]:appearance-none
                       [&::-webkit-slider-thumb]:w-2.5
                       [&::-webkit-slider-thumb]:h-2.5
                       [&::-webkit-slider-thumb]:rounded-full
                       [&::-webkit-slider-thumb]:bg-orange-400
                       [&::-webkit-slider-thumb]:cursor-pointer
                       [&::-moz-range-thumb]:w-2.5
                       [&::-moz-range-thumb]:h-2.5
                       [&::-moz-range-thumb]:rounded-full
                       [&::-moz-range-thumb]:bg-orange-400
                       [&::-moz-range-thumb]:border-0
                       hover:[&::-webkit-slider-thumb]:bg-orange-300
                       hover:[&::-moz-range-thumb]:bg-orange-300"
          />
        </div>
      </div>

      {/* 提示文字 */}
      <div className="mt-2 text-[10px] text-slate-500 text-center">
        {isPlaying ? '循環播放中' : '已暫停'} • 使用時間軸拖曳或單步按鈕精確控制
      </div>
    </div>
  )
}
