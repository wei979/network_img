import React, { useEffect, useRef, useState } from 'react'
import { Play, Pause, RotateCcw, SkipBack, SkipForward } from 'lucide-react'
import { S } from '../lib/swiss-tokens'

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
  wrapperStyle,
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

  const handleMouseUp = () => {
    setIsDragging(false)
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
    const totalSeconds = Math.max(0, Math.round(value / 1000))
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const effectiveProgress = isDragging ? dragProgress : progress
  const progressPercent = Math.round(effectiveProgress * 100)

  return (
    <div
      style={{
        background: S.surface,
        borderRadius: S.radius.md,
        padding: 16,
        fontFamily: S.font.sans,
        ...wrapperStyle,
      }}
    >
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: '0.875rem', color: S.text.secondary }}>Timeline</span>
          {showTimeDisplay && (
            <span style={{ fontSize: '0.875rem', color: S.text.secondary, fontFamily: S.font.mono }}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          )}
        </div>

        <div
          ref={progressBarRef}
          style={{
            position: 'relative',
            height: 12,
            background: S.borderStrong,
            borderRadius: 6,
            cursor: 'pointer',
          }}
          onMouseDown={handleMouseDown}
        >
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              height: '100%',
              background: S.accent,
              borderRadius: 6,
              transition: isDragging ? 'none' : 'width 0.15s',
              width: `${effectiveProgress * 100}%`,
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '50%',
              transform: 'translateY(-50%)',
              width: 16,
              height: 16,
              background: S.accent,
              borderRadius: '50%',
              border: `2px solid ${S.text.primary}`,
              cursor: isDragging ? 'grabbing' : 'grab',
              transition: isDragging ? 'none' : 'left 0.15s',
              left: `calc(${effectiveProgress * 100}% - 8px)`,
            }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={handleResetClick}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 40, height: 40,
              background: S.surfaceHover, color: S.text.secondary,
              borderRadius: S.radius.sm, border: 'none', cursor: 'pointer',
            }}
            title="Reset"
          >
            <RotateCcw size={16} />
          </button>

          <button
            onClick={handleSkipBackward}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 40, height: 40,
              background: S.surfaceHover, color: S.text.secondary,
              borderRadius: S.radius.sm, border: 'none', cursor: 'pointer',
              opacity: effectiveProgress <= 0 ? 0.3 : 1,
            }}
            title="Back 10%"
            disabled={effectiveProgress <= 0}
          >
            <SkipBack size={16} />
          </button>

          <button
            onClick={handlePlayToggle}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 48, height: 48,
              background: isCompleted ? S.protocol.HTTP : isPlaying ? S.accent : S.accentDim,
              color: S.text.primary,
              borderRadius: S.radius.sm, border: 'none', cursor: 'pointer',
            }}
            disabled={isCompleted && progress >= 1}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
          </button>

          <button
            onClick={handleSkipForward}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 40, height: 40,
              background: S.surfaceHover, color: S.text.secondary,
              borderRadius: S.radius.sm, border: 'none', cursor: 'pointer',
              opacity: effectiveProgress >= 1 ? 0.3 : 1,
            }}
            title="Forward 10%"
            disabled={effectiveProgress >= 1}
          >
            <SkipForward size={16} />
          </button>
        </div>

        {showSpeedControl && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.875rem', color: S.text.secondary }}>Speed</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {SPEED_PRESETS.map((speed) => (
                <button
                  key={speed}
                  type="button"
                  onClick={() => handleSpeedSelect(speed)}
                  style={{
                    padding: '4px 8px',
                    fontSize: '0.75rem',
                    borderRadius: S.radius.sm,
                    border: 'none',
                    cursor: 'pointer',
                    background: playbackSpeed === speed ? S.accent : S.surfaceHover,
                    color: playbackSpeed === speed ? S.text.primary : S.text.secondary,
                  }}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: S.text.secondary }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span>{progressPercent}%</span>
          {playbackSpeed !== 1 && <span>Speed: {playbackSpeed}x</span>}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isCompleted && <span style={{ color: S.protocol.HTTP, fontWeight: 500 }}>Done</span>}
          {isPlaying && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 8, height: 8, background: S.accent, borderRadius: '50%', animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite' }} />
              <span>Playing</span>
            </div>
          )}
          {isDragging && <span style={{ color: S.accent, fontWeight: 500 }}>Seeking</span>}
        </div>
      </div>
    </div>
  )
}

export default TimelineControl
