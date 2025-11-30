/**
 * useLearningActionDetector.js - 學習操作偵測 Hook
 *
 * 監聽使用者操作並驗證是否符合教學步驟要求
 * 支援的操作類型：
 * - drag: 拖曳節點
 * - click: 點擊元素
 * - scroll: 縮放/滾動
 * - state-change: 狀態變化（如選擇連線）
 */

import { useEffect, useRef, useCallback } from 'react'

/**
 * 操作偵測 Hook
 * @param {Object} options
 * @param {Object} options.currentStep - 當前步驟物件
 * @param {Function} options.onActionComplete - 操作完成回調
 * @param {Object} options.appState - 應用狀態（用於 state-change 驗證）
 * @param {boolean} options.isActive - 是否啟用偵測
 */
export function useLearningActionDetector({
  currentStep,
  onActionComplete,
  appState = {},
  isActive = true
}) {
  const hasCompletedRef = useRef(false)
  const dragStartTimeRef = useRef(null)
  const scrollCountRef = useRef(0)

  // 重置完成狀態
  useEffect(() => {
    hasCompletedRef.current = false
    dragStartTimeRef.current = null
    scrollCountRef.current = 0
  }, [currentStep?.id])

  // 標記操作完成
  const markComplete = useCallback(() => {
    if (!hasCompletedRef.current && onActionComplete) {
      hasCompletedRef.current = true
      // 延遲一小段時間讓使用者看到效果
      setTimeout(() => {
        onActionComplete()
      }, 500)
    }
  }, [onActionComplete])

  // 驗證狀態變化條件
  const checkStateCondition = useCallback((condition, state) => {
    if (!condition) return false

    // 簡單的條件評估（支援 !== null, === true 等）
    try {
      // 解析條件，例如 "selectedConnectionId !== null"
      const match = condition.match(/(\w+)\s*(===|!==|>|<|>=|<=)\s*(.+)/)
      if (match) {
        const [, key, operator, value] = match
        const actualValue = state[key]
        const expectedValue = value === 'null' ? null : value === 'true' ? true : value === 'false' ? false : value

        switch (operator) {
          case '===':
            return actualValue === expectedValue
          case '!==':
            return actualValue !== expectedValue
          case '>':
            return actualValue > Number(expectedValue)
          case '<':
            return actualValue < Number(expectedValue)
          case '>=':
            return actualValue >= Number(expectedValue)
          case '<=':
            return actualValue <= Number(expectedValue)
          default:
            return false
        }
      }
    } catch (e) {
      console.warn('條件評估失敗:', condition, e)
    }
    return false
  }, [])

  // 監聽 DOM 事件
  useEffect(() => {
    if (!isActive || !currentStep?.validation) return

    const { type, action, target, condition } = currentStep.validation

    // 狀態變化類型：直接檢查 appState
    if (type === 'state-change' && condition) {
      if (checkStateCondition(condition, appState)) {
        markComplete()
      }
      return
    }

    // DOM 事件偵測
    const handleMouseDown = (e) => {
      if (type === 'interaction' && action === 'drag') {
        // 檢查是否在目標元素上
        const targetEl = target ? document.querySelector(target) : null
        const isOnTarget = !target || (targetEl && (targetEl.contains(e.target) || e.target.closest(target)))

        if (isOnTarget) {
          dragStartTimeRef.current = Date.now()
        }
      }
    }

    const handleMouseUp = () => {
      if (type === 'interaction' && action === 'drag' && dragStartTimeRef.current) {
        const dragDuration = Date.now() - dragStartTimeRef.current
        // 拖曳超過 200ms 視為有效拖曳
        if (dragDuration > 200) {
          markComplete()
        }
        dragStartTimeRef.current = null
      }
    }

    const handleClick = (e) => {
      if (type === 'interaction' && action === 'click') {
        const targetEl = target ? document.querySelector(target) : null
        const isOnTarget = !target || (targetEl && (targetEl.contains(e.target) || e.target.closest(target)))

        if (isOnTarget) {
          markComplete()
        }
      }
    }

    const handleWheel = (e) => {
      if (type === 'interaction' && action === 'scroll') {
        const targetEl = target ? document.querySelector(target) : null
        const isOnTarget = !target || (targetEl && targetEl.contains(e.target))

        if (isOnTarget) {
          scrollCountRef.current++
          // 滾動 3 次以上視為有效
          if (scrollCountRef.current >= 3) {
            markComplete()
          }
        }
      }
    }

    // 添加事件監聽器
    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('mouseup', handleMouseUp)
    document.addEventListener('click', handleClick)
    document.addEventListener('wheel', handleWheel)

    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('click', handleClick)
      document.removeEventListener('wheel', handleWheel)
    }
  }, [isActive, currentStep, appState, checkStateCondition, markComplete])

  // 返回當前偵測狀態
  return {
    isDetecting: isActive && !!currentStep?.validation,
    hasCompleted: hasCompletedRef.current,
    validationType: currentStep?.validation?.type,
    validationAction: currentStep?.validation?.action
  }
}

export default useLearningActionDetector
