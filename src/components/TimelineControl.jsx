import React, { useEffect, useRef, useState } from 'react'
import { Play, Pause, RotateCcw, SkipBack, SkipForward } from 'lucide-react'

const SPEED_PRESETS = [0.25, 0.5, 1, 1.5, 2, 4]

const TimelineControl = ({
  isPlaying,
  onPlay,
  onPause,
  onReset,
  progress = 0,
  onSeek,
  duration = 100,
  currentTime = 0,
  playbackSpeed = 1,
  onSpeedChange,
  isCompleted = false,
  showSpeedControl = true,
  showTimeDisplay = true,
  className = ''
}) => {
  const [isDragging, setIsDragging] = useState(false)
  const [dragProgress, setDragProgress] = useState(progress)
  const progressBarRef = useRef(null)

  useEffect(() => {
    if (!isDragging) {
      setDragProgress(progress)
    }
  }, [progress, isDragging])

  const clampProgress = (value) => Math.max(0, Math.min(1, value))

  const updateProgressFromPosition = (clientX) => {
    if (!progressBarRef.current) return
    const rect = progressBarRef.current.getBoundingClientRect()
    const relative = (clientX - rect.left) / rect.width
    const nextProgress = clampProgress(relative)
    setDragProgress(nextProgress)
    if (onSeek) {
      onSeek(nextProgress)
    }
  }

  const handleMouseDown = (event) => {
    setIsDragging(true)
    updateProgressFromPosition(event.clientX)
  }

  useEffect(() => {
    if (!isDragging) {
      return
    }

    const handleMove = (event) => updateProgressFromPosition(event.clientX)
    const handleUp = () => setIsDragging(false)

    document.addEventListener('mousemove', handleMove)
    document.addEventListener('mouseup', handleUp)

    return () => {
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseup', handleUp)
    }
  }, [isDragging])

  const handlePlayToggle = () => {
    if (isPlaying) {
      onPause?.()
    } else {
      onPlay?.()
    }
  }

  const handleResetClick = () => {
    onReset?.()
  }

  const handleSkipBackward = () => {
    const nextProgress = clampProgress((isDragging ? dragProgress : progress) - 0.1)
    setDragProgress(nextProgress)
    onSeek?.(nextProgress)
  }

  const handleSkipForward = () => {
    const nextProgress = clampProgress((isDragging ? dragProgress : progress) + 0.1)
    setDragProgress(nextProgress)
    onSeek?.(nextProgress)
  }

  const handleSpeedSelect = (speed) => {
    onSpeedChange?.(speed)
  }

  const formatTime = (value) => {
    const totalSeconds = Math.max(0, Math.floor(value / 100))
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const effectiveProgress = isDragging ? dragProgress : progress
  const progressPercent = Math.round(effectiveProgress * 100)

  return (
    <div className={`bg-slate-800/50 rounded-lg p-4 border border-slate-700 ${className}`}>
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-slate-300">時間軸</span>
          {showTimeDisplay && (
            <span className="text-sm text-slate-400 font-mono">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          )}
        </div>

        <div
          ref={progressBarRef}
          className="relative h-2 bg-slate-700 rounded-full cursor-pointer group"
          onMouseDown={handleMouseDown}
        >
          <div
            className="absolute left-0 top-0 h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-150"
            style={{ width: `${effectiveProgress * 100}%` }}
          />
          <div
            className="absolute top-1/2 transform -translate-y-1/2 w-4 h-4 bg-white rounded-full border-2 border-blue-500 shadow-lg cursor-grab active:cursor-grabbing transition-all duration-150 group-hover:scale-110"
            style={{ left: `calc(${effectiveProgress * 100}% - 8px)` }}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-y-4">
        <div className="flex items-center gap-2">
          <button
            onClick={handleResetClick}
            className="flex items-center justify-center w-10 h-10 bg-slate-700 hover:bg-slate-600/80 text-slate-300 rounded-lg transition-colors"
            title="重設"
          >
            <RotateCcw className="w-6 h-6" />
          </button>

          <button
            onClick={handleSkipBackward}
            className="flex items-center justify-center w-10 h-10 bg-slate-700 hover:bg-slate-600/80 text-slate-300 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="後退 10%"
            disabled={effectiveProgress <= 0}
          >
            <SkipBack className="w-6 h-6" />
          </button>

          <button
            onClick={handlePlayToggle}
            className={`flex items-center justify-center w-12 h-12 text-white rounded-full transition-colors shadow-lg ${
              isCompleted && progress >= 1
                ? 'bg-green-600 cursor-default'
                : isPlaying
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-blue-500 hover:bg-blue-600'
            }`}
            disabled={isCompleted && progress >= 1}
            title={isPlaying ? '暫停' : '播放'}
          >
            {isCompleted && progress >= 1 ? (
              <RotateCcw className="w-8 h-8" onClick={handleResetClick}/>
            ) : isPlaying ? (
              <Pause className="w-8 h-8" />
            ) : (
              <Play className="w-8 h-8" />
            )}
          </button>

          <button
            onClick={handleSkipForward}
            className="flex items-center justify-center w-10 h-10 bg-slate-700 hover:bg-slate-600/80 text-slate-300 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="前進 10%"
            disabled={effectiveProgress >= 1}
          >
            <SkipForward className="w-6 h-6" />
          </button>
        </div>

        {showSpeedControl && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">速度</span>
            <div className="flex items-center gap-1 bg-slate-700/80 p-1 rounded-lg">
              {SPEED_PRESETS.map((speed) => (
                <button
                  key={speed}
                  type="button"
                  onClick={() => handleSpeedSelect(speed)}
                  className={`px-2 py-1 text-xs rounded-md transition-colors ${
                    playbackSpeed === speed
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'text-slate-300 hover:bg-slate-600/70'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-slate-400 h-4">
        <div className="flex items-center gap-4">
          <span>進度：{progressPercent}%</span>
          {playbackSpeed !== 1 && <span>速度：{playbackSpeed}x</span>}
        </div>

        <div className="flex items-center gap-2">
          {isCompleted && <span className="text-green-400 font-medium">已完成</span>}
          {isPlaying && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span>播放中</span>
            </div>
          )}
          {isDragging && <span className="text-blue-400 font-medium">拖曳中</span>}
        </div>
      </div>
    </div>
  )
}

export default TimelineControl