/**
 * TutorialOverlay.jsx - 教學引導覆蓋層
 *
 * 遊戲化教學引導系統的核心視覺組件，提供：
 * - 聚焦遮罩：除目標元素外變暗
 * - 脈衝高亮：目標元素周圍閃爍邊框
 * - 教學提示卡片：顯示步驟說明
 * - 導航按鈕：上一步/下一步/跳過
 */

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronLeft, ChevronRight, SkipForward, BookOpen, X, Lightbulb } from 'lucide-react'
import { S } from '../lib/swiss-tokens'

/**
 * 計算目標元素的位置和大小
 * @param {string} selector - CSS 選擇器
 * @returns {Object|null} 位置和大小物件
 */
function getTargetRect(selector) {
  if (!selector) return null

  const element = document.querySelector(selector)
  if (!element) return null

  const rect = element.getBoundingClientRect()
  const padding = 8 // 高亮框的內邊距

  return {
    left: rect.left - padding,
    top: rect.top - padding,
    width: rect.width + padding * 2,
    height: rect.height + padding * 2
  }
}

/**
 * 計算提示卡片的位置
 * @param {Object} targetRect - 目標元素的位置
 * @param {string} position - 提示卡片位置 (top/bottom/left/right)
 * @param {Object} cardSize - 卡片大小
 * @returns {Object} 位置樣式
 */
function getTooltipPosition(targetRect, position = 'bottom', cardSize = { width: 320, height: 200 }) {
  if (!targetRect) {
    // 沒有目標時顯示在畫面中央
    return {
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -50%)'
    }
  }

  const margin = 16
  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight
  }

  let style = {}

  switch (position) {
    case 'top':
      style = {
        left: targetRect.left + targetRect.width / 2 - cardSize.width / 2,
        top: targetRect.top - cardSize.height - margin
      }
      break
    case 'bottom':
      style = {
        left: targetRect.left + targetRect.width / 2 - cardSize.width / 2,
        top: targetRect.top + targetRect.height + margin
      }
      break
    case 'left':
      style = {
        left: targetRect.left - cardSize.width - margin,
        top: targetRect.top + targetRect.height / 2 - cardSize.height / 2
      }
      break
    case 'right':
      style = {
        left: targetRect.left + targetRect.width + margin,
        top: targetRect.top + targetRect.height / 2 - cardSize.height / 2
      }
      break
    default:
      style = {
        left: targetRect.left + targetRect.width / 2 - cardSize.width / 2,
        top: targetRect.top + targetRect.height + margin
      }
  }

  // 確保不超出視窗邊界
  if (style.left < margin) style.left = margin
  if (style.left + cardSize.width > viewport.width - margin) {
    style.left = viewport.width - cardSize.width - margin
  }
  if (style.top < margin) style.top = margin
  if (style.top + cardSize.height > viewport.height - margin) {
    style.top = viewport.height - cardSize.height - margin
  }

  return style
}

/**
 * TutorialOverlay 教學引導覆蓋層組件
 */
export default function TutorialOverlay({
  step,                // 當前步驟物件
  stepIndex,           // 當前步驟索引
  totalSteps,          // 總步驟數
  lessonTitle,         // 課節標題
  onNext,              // 下一步回調
  onPrev,              // 上一步回調
  onSkip,              // 跳過回調
  onShowTheory,        // 顯示理論回調
  onClose,             // 關閉回調
  isVisible = true     // 是否可見
}) {
  const [targetRect, setTargetRect] = useState(null)
  const [tooltipStyle, setTooltipStyle] = useState({})
  const cardRef = useRef(null)

  // 更新目標位置
  const updateTargetPosition = useCallback(() => {
    if (step?.target) {
      const rect = getTargetRect(step.target)
      setTargetRect(rect)

      // 計算提示卡片位置
      const cardSize = cardRef.current
        ? { width: cardRef.current.offsetWidth, height: cardRef.current.offsetHeight }
        : { width: 320, height: 200 }
      setTooltipStyle(getTooltipPosition(rect, step.position, cardSize))

      // 如果目標元素存在，滾動到可見範圍
      if (rect) {
        const element = document.querySelector(step.target)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }
    } else {
      setTargetRect(null)
      setTooltipStyle({
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)'
      })
    }
  }, [step])

  // 監聽步驟變化和視窗大小變化
  useEffect(() => {
    updateTargetPosition()

    const handleResize = () => updateTargetPosition()
    window.addEventListener('resize', handleResize)
    window.addEventListener('scroll', handleResize)

    // 定期更新位置（處理動態元素）
    const interval = setInterval(updateTargetPosition, 500)

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('scroll', handleResize)
      clearInterval(interval)
    }
  }, [updateTargetPosition])

  // 自動進入下一步（用於觀察類步驟）
  useEffect(() => {
    if (step?.autoAdvance && onNext) {
      const timer = setTimeout(onNext, step.autoAdvance)
      return () => clearTimeout(timer)
    }
  }, [step, onNext])

  if (!isVisible || !step) return null

  // 判斷步驟類型
  const isTheoryStep = step.type === 'theory'
  const isActionStep = step.type === 'action'
  const isObserveStep = step.type === 'observe'
  const hasTheoryComponent = !!step.theoryComponent

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      {/* 聚焦遮罩 */}
      {targetRect && (
        <svg className="absolute inset-0 w-full h-full">
          <defs>
            <mask id="tutorial-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              <rect
                x={targetRect.left}
                y={targetRect.top}
                width={targetRect.width}
                height={targetRect.height}
                rx="4"
                fill="black"
              />
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(0, 0, 0, 0.7)"
            mask="url(#tutorial-mask)"
          />
        </svg>
      )}

      {/* 無目標時的全螢幕遮罩 */}
      {!targetRect && (
        <div className="absolute inset-0 bg-black/70" />
      )}

      {/* 高亮框 */}
      {targetRect && (
        <div
          className="absolute animate-pulse pointer-events-none"
          style={{
            left: targetRect.left,
            top: targetRect.top,
            width: targetRect.width,
            height: targetRect.height,
            border: `2px solid ${S.accent}`,
            borderRadius: S.radius.md,
            boxShadow: `0 0 20px ${S.accent}60, 0 0 40px ${S.accent}30`,
          }}
        />
      )}

      {/* 教學提示卡片 — keeps backdrop-blur as allowed exception */}
      <div
        ref={cardRef}
        className="absolute w-[340px] pointer-events-auto animate-fade-in-scale"
        style={{
          ...tooltipStyle,
          background: `${S.bgRaised}f0`,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderRadius: S.radius.lg,
          border: `1px solid ${S.accent}30`,
          boxShadow: `0 8px 32px ${S.bg}80`,
        }}
      >
        {/* 卡片標題列 */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${S.border}` }}>
          <div className="flex items-center gap-3">
            <div
              className="p-2"
              style={{
                borderRadius: S.radius.md,
                background: '#eab30818',
                border: '1px solid #eab30830',
              }}
            >
              <Lightbulb className="w-4 h-4" style={{ color: '#eab308' }} />
            </div>
            <span className="text-sm font-semibold tracking-wide" style={{ color: S.accent }}>
              步驟 {stepIndex + 1} / {totalSteps}
            </span>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 transition-all"
              style={{ borderRadius: S.radius.sm, color: S.text.tertiary }}
              onMouseEnter={e => { e.currentTarget.style.color = S.text.primary; e.currentTarget.style.background = `${S.surfaceHover}` }}
              onMouseLeave={e => { e.currentTarget.style.color = S.text.tertiary; e.currentTarget.style.background = 'transparent' }}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* 卡片內容 */}
        <div className="p-5">
          {/* 課節標題 */}
          {lessonTitle && (
            <div className="text-xs mb-1.5 font-medium" style={{ color: S.text.secondary }}>{lessonTitle}</div>
          )}

          {/* 步驟標題 */}
          <h3 className="text-xl font-bold mb-3 leading-tight" style={{ color: S.text.primary }}>{step.title}</h3>

          {/* 步驟說明 */}
          <p className="text-sm mb-5 leading-relaxed" style={{ color: S.text.secondary }}>{step.content}</p>

          {/* 提示訊息 */}
          {step.hint && (
            <div
              className="flex items-start gap-3 mb-5 p-3"
              style={{
                borderRadius: S.radius.md,
                background: '#eab30810',
                border: '1px solid #eab30820',
              }}
            >
              <span className="mt-0.5 text-lg" style={{ color: '#eab308' }}>💡</span>
              <p className="text-xs leading-relaxed" style={{ color: S.text.secondary }}>{step.hint}</p>
            </div>
          )}

          {/* 步驟類型標籤 */}
          <div className="flex items-center gap-2 mb-2">
            {isActionStep && (
              <span
                className="px-3 py-1 text-xs font-medium"
                style={{
                  borderRadius: S.radius.sm,
                  background: `${S.protocol.HTTP}18`,
                  color: S.protocol.HTTP,
                  border: `1px solid ${S.protocol.HTTP}30`,
                }}
              >
                操作步驟
              </span>
            )}
            {isObserveStep && (
              <span
                className="px-3 py-1 text-xs font-medium"
                style={{
                  borderRadius: S.radius.sm,
                  background: `${S.protocol.UDP}18`,
                  color: S.protocol.UDP,
                  border: `1px solid ${S.protocol.UDP}30`,
                }}
              >
                觀察步驟
              </span>
            )}
            {isTheoryStep && (
              <span
                className="px-3 py-1 text-xs font-medium"
                style={{
                  borderRadius: S.radius.sm,
                  background: `${S.protocol.DNS}18`,
                  color: S.protocol.DNS,
                  border: `1px solid ${S.protocol.DNS}30`,
                }}
              >
                理論課
              </span>
            )}
          </div>
        </div>

        {/* 卡片底部按鈕 */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{
            borderTop: `1px solid ${S.border}`,
            background: `${S.bg}40`,
            borderRadius: `0 0 ${S.radius.lg}px ${S.radius.lg}px`,
          }}
        >
          {/* 左側：上一步 */}
          <button
            onClick={onPrev}
            disabled={stepIndex === 0}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-all"
            style={{
              borderRadius: S.radius.sm,
              color: stepIndex === 0 ? S.text.faint : S.text.secondary,
              cursor: stepIndex === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            <ChevronLeft className="w-4 h-4" />
            上一步
          </button>

          {/* 中間：理論/跳過 */}
          <div className="flex items-center gap-2">
            {hasTheoryComponent && (
              <button
                onClick={() => onShowTheory?.(step.theoryComponent)}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-all"
                style={{
                  borderRadius: S.radius.md,
                  background: S.protocol.DNS,
                  color: '#fff',
                }}
              >
                <BookOpen className="w-4 h-4" />
                查看原理
              </button>
            )}
            <button
              onClick={onSkip}
              className="flex items-center gap-1.5 px-3 py-2 text-sm transition-all"
              style={{ borderRadius: S.radius.sm, color: S.text.tertiary }}
            >
              <SkipForward className="w-4 h-4" />
              跳過
            </button>
          </div>

          {/* 右側：下一步 */}
          <button
            onClick={onNext}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-all"
            style={{
              borderRadius: S.radius.md,
              background: S.accent,
              color: '#fff',
            }}
          >
            下一步
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 進度指示器 */}
      <div
        className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex items-center gap-2 pointer-events-none px-4 py-2.5 rounded-full"
        style={{
          background: `${S.bgRaised}e0`,
          border: `1px solid ${S.border}`,
        }}
      >
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={`h-2 rounded-full transition-all duration-500 ${i === stepIndex ? 'animate-pulse' : ''}`}
            style={{
              width: i === stepIndex ? 32 : 8,
              background: i < stepIndex
                ? S.accent
                : i === stepIndex
                  ? S.accent
                  : `${S.text.faint}80`,
            }}
          />
        ))}
      </div>
    </div>
  )
}
