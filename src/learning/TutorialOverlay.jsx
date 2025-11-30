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
                rx="8"
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
          className="absolute border-2 border-cyan-400 rounded-lg animate-pulse pointer-events-none"
          style={{
            left: targetRect.left,
            top: targetRect.top,
            width: targetRect.width,
            height: targetRect.height,
            boxShadow: '0 0 20px rgba(34, 211, 238, 0.5), 0 0 40px rgba(34, 211, 238, 0.3)'
          }}
        />
      )}

      {/* 教學提示卡片 */}
      <div
        ref={cardRef}
        className="absolute w-80 bg-slate-800/95 backdrop-blur-sm rounded-xl border border-cyan-500/50 shadow-2xl pointer-events-auto"
        style={tooltipStyle}
      >
        {/* 卡片標題列 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-yellow-400" />
            <span className="text-xs text-cyan-400 font-semibold">
              步驟 {stepIndex + 1} / {totalSteps}
            </span>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* 卡片內容 */}
        <div className="p-4">
          {/* 課節標題 */}
          {lessonTitle && (
            <div className="text-xs text-slate-400 mb-1">{lessonTitle}</div>
          )}

          {/* 步驟標題 */}
          <h3 className="text-lg font-bold text-white mb-2">{step.title}</h3>

          {/* 步驟說明 */}
          <p className="text-sm text-slate-300 mb-4 leading-relaxed">{step.content}</p>

          {/* 提示訊息 */}
          {step.hint && (
            <div className="flex items-start gap-2 mb-4 p-2 bg-slate-700/50 rounded-lg">
              <span className="text-yellow-400 mt-0.5">💡</span>
              <p className="text-xs text-slate-400">{step.hint}</p>
            </div>
          )}

          {/* 步驟類型標籤 */}
          <div className="flex items-center gap-2 mb-4">
            {isActionStep && (
              <span className="px-2 py-0.5 text-xs bg-green-600/30 text-green-300 rounded-full">
                👆 操作步驟
              </span>
            )}
            {isObserveStep && (
              <span className="px-2 py-0.5 text-xs bg-blue-600/30 text-blue-300 rounded-full">
                👁 觀察步驟
              </span>
            )}
            {isTheoryStep && (
              <span className="px-2 py-0.5 text-xs bg-purple-600/30 text-purple-300 rounded-full">
                📖 理論課
              </span>
            )}
          </div>
        </div>

        {/* 卡片底部按鈕 */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700 bg-slate-800/50 rounded-b-xl">
          {/* 左側：上一步 */}
          <button
            onClick={onPrev}
            disabled={stepIndex === 0}
            className={`flex items-center gap-1 text-sm transition-colors ${
              stepIndex === 0
                ? 'text-slate-600 cursor-not-allowed'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            上一步
          </button>

          {/* 中間：理論/跳過 */}
          <div className="flex items-center gap-2">
            {hasTheoryComponent && (
              <button
                onClick={() => onShowTheory?.(step.theoryComponent)}
                className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-sm rounded-lg transition-colors"
              >
                <BookOpen className="w-4 h-4" />
                查看原理
              </button>
            )}
            <button
              onClick={onSkip}
              className="flex items-center gap-1 text-sm text-slate-400 hover:text-white transition-colors"
            >
              <SkipForward className="w-4 h-4" />
              跳過
            </button>
          </div>

          {/* 右側：下一步 */}
          <button
            onClick={onNext}
            className="flex items-center gap-1 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-sm rounded-lg transition-colors"
          >
            下一步
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 進度指示器 */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-1.5 pointer-events-none">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              i < stepIndex
                ? 'bg-cyan-400'
                : i === stepIndex
                  ? 'bg-cyan-400 w-6'
                  : 'bg-slate-600'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
