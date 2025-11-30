/**
 * LearningModeProvider.jsx - 學習模式 Context Provider
 *
 * 提供學習模式所需的全域狀態管理，包括：
 * - 當前課程/課節/步驟
 * - 學習進度追蹤
 * - 教學引導控制
 * - 理論彈窗管理
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { LearningStorage } from './LearningStorage'

// 建立 Context
const LearningModeContext = createContext(null)

/**
 * 學習模式 Provider 元件
 */
export function LearningModeProvider({ children, isActive = false }) {
  // ========== 核心狀態 ==========
  const [isLearningMode, setIsLearningMode] = useState(isActive)
  const [currentCourse, setCurrentCourse] = useState(null)       // 當前課程定義
  const [currentLevelId, setCurrentLevelId] = useState('level1') // 當前關卡 ID
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0) // 當前課節索引
  const [currentStepIndex, setCurrentStepIndex] = useState(0)     // 當前步驟索引

  // ========== UI 狀態 ==========
  const [showTheoryModal, setShowTheoryModal] = useState(false)   // 理論彈窗
  const [theoryComponent, setTheoryComponent] = useState(null)    // 要顯示的理論組件
  const [showCourseSidebar, setShowCourseSidebar] = useState(true) // 課程側邊欄
  const [showTutorialOverlay, setShowTutorialOverlay] = useState(true) // 教學覆蓋層

  // ========== 測驗狀態 ==========
  const [showQuizModal, setShowQuizModal] = useState(false)       // 測驗彈窗
  const [currentQuiz, setCurrentQuiz] = useState(null)            // 當前測驗定義
  const [quizResults, setQuizResults] = useState({})              // 測驗結果 { levelId: { score, passed, date } }

  // ========== 進度狀態 ==========
  const [learningProgress, setLearningProgress] = useState(() => LearningStorage.getProgress())
  const [completedSteps, setCompletedSteps] = useState([])        // 當前課節已完成的步驟

  // ========== 同步外部 isActive 屬性 ==========
  useEffect(() => {
    setIsLearningMode(isActive)
  }, [isActive])

  // ========== 從 localStorage 載入進度 ==========
  useEffect(() => {
    const progress = LearningStorage.getProgress()
    setLearningProgress(progress)
    setCurrentLevelId(`level${progress.currentLevel}`)
    setCurrentLessonIndex(progress.currentLesson)
    setCurrentStepIndex(progress.currentStep)
  }, [])

  // ========== 進度自動儲存 ==========
  useEffect(() => {
    if (isLearningMode) {
      const levelNumber = parseInt(currentLevelId.replace('level', ''))
      LearningStorage.updatePosition(levelNumber, currentLessonIndex, currentStepIndex)
    }
  }, [isLearningMode, currentLevelId, currentLessonIndex, currentStepIndex])

  // ========== 課程導航方法 ==========

  /**
   * 進入下一步
   */
  const nextStep = useCallback(() => {
    if (!currentCourse) return

    const currentLesson = currentCourse.lessons[currentLessonIndex]
    if (!currentLesson) return

    // 標記當前步驟完成
    const stepKey = `${currentLessonIndex}-${currentStepIndex}`
    if (!completedSteps.includes(stepKey)) {
      setCompletedSteps(prev => [...prev, stepKey])
    }

    // 檢查是否還有下一步
    if (currentStepIndex < currentLesson.steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1)
    } else {
      // 課節完成，進入下一課節
      LearningStorage.markLessonComplete(currentLevelId, currentLesson.id)
      if (currentLessonIndex < currentCourse.lessons.length - 1) {
        setCurrentLessonIndex(prev => prev + 1)
        setCurrentStepIndex(0)
        setCompletedSteps([])
      } else {
        // 整個課程完成
        console.log('課程完成！')
        // 解鎖下一關
        const nextLevel = parseInt(currentLevelId.replace('level', '')) + 1
        LearningStorage.unlockLevel(nextLevel)
      }
    }
  }, [currentCourse, currentLessonIndex, currentStepIndex, completedSteps, currentLevelId])

  /**
   * 返回上一步
   */
  const prevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1)
    } else if (currentLessonIndex > 0) {
      // 返回上一課節的最後一步
      setCurrentLessonIndex(prev => prev - 1)
      if (currentCourse) {
        const prevLesson = currentCourse.lessons[currentLessonIndex - 1]
        if (prevLesson) {
          setCurrentStepIndex(prevLesson.steps.length - 1)
        }
      }
    }
  }, [currentStepIndex, currentLessonIndex, currentCourse])

  /**
   * 跳到指定課節
   */
  const goToLesson = useCallback((lessonIndex) => {
    setCurrentLessonIndex(lessonIndex)
    setCurrentStepIndex(0)
    setCompletedSteps([])
  }, [])

  /**
   * 跳到指定關卡
   */
  const goToLevel = useCallback((levelId) => {
    setCurrentLevelId(levelId)
    setCurrentLessonIndex(0)
    setCurrentStepIndex(0)
    setCompletedSteps([])
    // 課程會由外部載入
  }, [])

  /**
   * 跳過當前步驟
   */
  const skipStep = useCallback(() => {
    nextStep()
  }, [nextStep])

  // ========== 理論彈窗方法 ==========

  /**
   * 顯示理論彈窗
   * @param {string} componentName - 要顯示的組件名稱
   */
  const showTheory = useCallback((componentName) => {
    setTheoryComponent(componentName)
    setShowTheoryModal(true)
  }, [])

  /**
   * 關閉理論彈窗
   */
  const hideTheory = useCallback(() => {
    setShowTheoryModal(false)
    setTheoryComponent(null)
  }, [])

  // ========== 測驗方法 ==========

  /**
   * 開始測驗
   * @param {Object} quiz - 測驗定義
   */
  const startQuiz = useCallback((quiz) => {
    if (!quiz) return
    setCurrentQuiz(quiz)
    setShowQuizModal(true)
  }, [])

  /**
   * 關閉測驗彈窗
   */
  const hideQuiz = useCallback(() => {
    setShowQuizModal(false)
    setCurrentQuiz(null)
  }, [])

  /**
   * 完成測驗
   * @param {Object} result - { score, totalQuestions, percentage, passed }
   */
  const completeQuiz = useCallback((result) => {
    if (!result) return

    // 儲存測驗結果
    setQuizResults(prev => ({
      ...prev,
      [currentLevelId]: {
        ...result,
        date: new Date().toISOString()
      }
    }))

    // 如果通過，解鎖下一關
    if (result.passed) {
      const nextLevel = parseInt(currentLevelId.replace('level', '')) + 1
      LearningStorage.unlockLevel(nextLevel)
      LearningStorage.markLevelComplete(currentLevelId)

      // 刷新進度
      setLearningProgress(LearningStorage.getProgress())
    }

    setShowQuizModal(false)
    setCurrentQuiz(null)
  }, [currentLevelId])

  /**
   * 檢查關卡是否已通過測驗
   */
  const isLevelQuizPassed = useCallback((levelId) => {
    return quizResults[levelId]?.passed === true
  }, [quizResults])

  /**
   * 取得關卡測驗結果
   */
  const getLevelQuizResult = useCallback((levelId) => {
    return quizResults[levelId] || null
  }, [quizResults])

  // ========== 輔助方法 ==========

  /**
   * 取得當前步驟
   */
  const getCurrentStep = useCallback(() => {
    if (!currentCourse) return null
    const lesson = currentCourse.lessons[currentLessonIndex]
    if (!lesson) return null
    return lesson.steps[currentStepIndex] || null
  }, [currentCourse, currentLessonIndex, currentStepIndex])

  /**
   * 取得當前課節
   */
  const getCurrentLesson = useCallback(() => {
    if (!currentCourse) return null
    return currentCourse.lessons[currentLessonIndex] || null
  }, [currentCourse, currentLessonIndex])

  /**
   * 計算當前關卡進度
   */
  const getLevelProgress = useCallback(() => {
    if (!currentCourse) return 0
    const totalSteps = currentCourse.lessons.reduce((sum, lesson) => sum + lesson.steps.length, 0)
    let completedCount = 0
    for (let i = 0; i < currentLessonIndex; i++) {
      completedCount += currentCourse.lessons[i].steps.length
    }
    completedCount += currentStepIndex
    return Math.round((completedCount / totalSteps) * 100)
  }, [currentCourse, currentLessonIndex, currentStepIndex])

  /**
   * 檢查步驟是否已完成
   */
  const isStepCompleted = useCallback((lessonIndex, stepIndex) => {
    if (lessonIndex < currentLessonIndex) return true
    if (lessonIndex === currentLessonIndex) {
      return completedSteps.includes(`${lessonIndex}-${stepIndex}`)
    }
    return false
  }, [currentLessonIndex, completedSteps])

  // ========== Context Value ==========
  const value = {
    // 狀態
    isLearningMode,
    currentCourse,
    currentLevelId,
    currentLessonIndex,
    currentStepIndex,
    showTheoryModal,
    theoryComponent,
    showCourseSidebar,
    showTutorialOverlay,
    learningProgress,

    // 設定器
    setIsLearningMode,
    setCurrentCourse,
    setCurrentLevelId,
    setShowCourseSidebar,
    setShowTutorialOverlay,

    // 導航方法
    nextStep,
    prevStep,
    skipStep,
    goToLesson,
    goToLevel,

    // 理論彈窗
    showTheory,
    hideTheory,

    // 測驗功能
    showQuizModal,
    currentQuiz,
    quizResults,
    startQuiz,
    hideQuiz,
    completeQuiz,
    isLevelQuizPassed,
    getLevelQuizResult,

    // 輔助方法
    getCurrentStep,
    getCurrentLesson,
    getLevelProgress,
    isStepCompleted,

    // 進度
    getOverallProgress: () => LearningStorage.getOverallProgress(),
    getStatistics: () => LearningStorage.getStatistics(),
    resetProgress: () => {
      LearningStorage.resetProgress()
      setLearningProgress(LearningStorage.getProgress())
      setCurrentLevelId('level1')
      setCurrentLessonIndex(0)
      setCurrentStepIndex(0)
      setCompletedSteps([])
    }
  }

  return (
    <LearningModeContext.Provider value={value}>
      {children}
    </LearningModeContext.Provider>
  )
}

/**
 * 使用學習模式 Context 的 Hook
 * @returns {Object} 學習模式 Context 值
 */
export function useLearningMode() {
  const context = useContext(LearningModeContext)
  if (!context) {
    throw new Error('useLearningMode 必須在 LearningModeProvider 內使用')
  }
  return context
}

/**
 * 可選的學習模式 Hook（不拋出錯誤）
 * 用於可能不在 Provider 內的組件
 * @returns {Object|null} 學習模式 Context 值或 null
 */
export function useLearningModeOptional() {
  return useContext(LearningModeContext)
}

export default LearningModeProvider
