import React from 'react'
import { Play, Pause, SkipBack, SkipForward, Gauge } from 'lucide-react'
import { S } from '../lib/swiss-tokens'

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
    <div
      className={`p-3 ${className}`}
      style={{
        background: `${S.bgRaised}f0`,
        border: `1px solid ${S.border}`,
        borderRadius: S.radius.md,
      }}
    >
      {/* 時間資訊 */}
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs" style={{ color: S.text.secondary, fontFamily: S.font.mono }}>
          <span className="font-semibold" style={{ color: S.accent }}>{formatTime(currentTime)}</span>
          <span className="mx-1">/</span>
          <span>{formatTime(totalTime)}</span>
        </div>
        <div className="text-xs" style={{ color: S.text.secondary }}>
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
          className="w-full h-1.5 appearance-none cursor-pointer
                     [&::-webkit-slider-thumb]:appearance-none
                     [&::-webkit-slider-thumb]:w-3
                     [&::-webkit-slider-thumb]:h-3
                     [&::-webkit-slider-thumb]:rounded-full
                     [&::-webkit-slider-thumb]:cursor-pointer
                     [&::-moz-range-thumb]:w-3
                     [&::-moz-range-thumb]:h-3
                     [&::-moz-range-thumb]:rounded-full
                     [&::-moz-range-thumb]:border-0
                     [&::-moz-range-thumb]:cursor-pointer"
          style={{
            background: `linear-gradient(to right, ${S.accent} 0%, ${S.accent} ${progress * 100}%, ${S.border} ${progress * 100}%, ${S.border} 100%)`,
            borderRadius: S.radius.sm,
          }}
        />
        <div className="flex justify-between mt-1">
          <div className="text-[10px]" style={{ color: S.text.tertiary }}>0%</div>
          <div className="text-[10px] font-semibold" style={{ color: S.accent }}>{Math.round(progress * 100)}%</div>
          <div className="text-[10px]" style={{ color: S.text.tertiary }}>100%</div>
        </div>
      </div>

      {/* 控制按鈕 */}
      <div className="flex items-center gap-2">
        {/* 單步後退 */}
        <button
          onClick={onStepBackward}
          className="p-1.5 transition-colors"
          style={{
            borderRadius: S.radius.sm,
            background: S.surface,
            color: S.text.secondary,
          }}
          title="單步後退"
        >
          <SkipBack className="w-4 h-4" />
        </button>

        {/* 播放/暫停 */}
        <button
          onClick={onPlayPause}
          className="p-2 transition-colors"
          style={{
            borderRadius: S.radius.md,
            background: S.accent,
            color: '#fff',
          }}
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
          className="p-1.5 transition-colors"
          style={{
            borderRadius: S.radius.sm,
            background: S.surface,
            color: S.text.secondary,
          }}
          title="單步前進"
        >
          <SkipForward className="w-4 h-4" />
        </button>

        {/* 分隔線 */}
        <div className="w-px h-6 mx-1" style={{ background: S.border }}></div>

        {/* 速度控制 */}
        <div className="flex items-center gap-2 flex-1">
          <Gauge className="w-4 h-4" style={{ color: S.text.tertiary }} />
          <div className="flex items-center gap-1">
            {speedOptions.map(speedValue => (
              <button
                key={speedValue}
                onClick={() => onSpeedChange(speedValue)}
                className="px-2 py-1 text-xs transition-colors"
                style={{
                  borderRadius: S.radius.sm,
                  background: speed === speedValue ? S.accent : S.surface,
                  color: speed === speedValue ? '#fff' : S.text.tertiary,
                }}
                title={`${speedValue}x 速度`}
              >
                {speedValue}x
              </button>
            ))}
          </div>
        </div>

        {/* 自訂速度滑桿 */}
        <div className="flex items-center gap-2 ml-2">
          <span className="text-xs min-w-[3ch]" style={{ color: S.text.secondary, fontFamily: S.font.mono }}>
            {speed.toFixed(1)}x
          </span>
          <input
            type="range"
            min="0.1"
            max="5"
            step="0.1"
            value={speed}
            onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
            className="w-20 h-1 appearance-none cursor-pointer
                       [&::-webkit-slider-thumb]:appearance-none
                       [&::-webkit-slider-thumb]:w-2.5
                       [&::-webkit-slider-thumb]:h-2.5
                       [&::-webkit-slider-thumb]:rounded-full
                       [&::-webkit-slider-thumb]:cursor-pointer
                       [&::-moz-range-thumb]:w-2.5
                       [&::-moz-range-thumb]:h-2.5
                       [&::-moz-range-thumb]:rounded-full
                       [&::-moz-range-thumb]:border-0"
            style={{
              background: S.border,
              borderRadius: S.radius.sm,
            }}
          />
        </div>
      </div>

      {/* 提示文字 */}
      <div className="mt-2 text-[10px] text-center" style={{ color: S.text.tertiary }}>
        {isPlaying ? '循環播放中' : '已暫停'} • 使用時間軸拖曳或單步按鈕精確控制
      </div>
    </div>
  )
}
