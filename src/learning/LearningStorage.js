/**
 * LearningStorage.js - 學習進度持久化管理
 *
 * 使用 localStorage 儲存學習進度，支援：
 * - 課程進度追蹤
 * - 測驗成績記錄
 * - 學習時間統計
 * - 斷點續學功能
 */

const STORAGE_KEY = 'network-analyzer-learning-progress'

/**
 * 預設的學習進度結構
 */
const DEFAULT_PROGRESS = {
  currentLevel: 1,
  currentLesson: 0,
  currentStep: 0,
  completedLessons: [],    // 格式: ['level1-lesson1', 'level1-lesson2', ...]
  quizScores: {},          // 格式: { 'quiz-level1': { score: 80, timestamp: '...' } }
  totalTimeSpent: 0,       // 總學習時間（毫秒）
  lastAccessTime: null,
  unlockedLevels: [1],     // 已解鎖的關卡
  achievements: [],        // 成就系統（未來擴充）
}

export const LearningStorage = {
  /**
   * 取得學習進度
   * @returns {Object} 學習進度物件
   */
  getProgress() {
    try {
      const data = localStorage.getItem(STORAGE_KEY)
      if (data) {
        const parsed = JSON.parse(data)
        // 合併預設值，確保新增欄位有預設值
        return { ...DEFAULT_PROGRESS, ...parsed }
      }
    } catch (error) {
      console.warn('無法讀取學習進度，使用預設值:', error)
    }
    return { ...DEFAULT_PROGRESS }
  },

  /**
   * 儲存學習進度
   * @param {Object} progress - 學習進度物件
   */
  saveProgress(progress) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        ...progress,
        lastAccessTime: new Date().toISOString()
      }))
    } catch (error) {
      console.error('無法儲存學習進度:', error)
    }
  },

  /**
   * 更新目前位置（課程、課節、步驟）
   * @param {number} level - 關卡編號
   * @param {number} lesson - 課節編號
   * @param {number} step - 步驟編號
   */
  updatePosition(level, lesson, step) {
    const progress = this.getProgress()
    progress.currentLevel = level
    progress.currentLesson = lesson
    progress.currentStep = step
    this.saveProgress(progress)
  },

  /**
   * 標記課節完成
   * @param {string} levelId - 關卡 ID (e.g., 'level1')
   * @param {string} lessonId - 課節 ID (e.g., 'lesson-1-1')
   */
  markLessonComplete(levelId, lessonId) {
    const progress = this.getProgress()
    const key = `${levelId}-${lessonId}`
    if (!progress.completedLessons.includes(key)) {
      progress.completedLessons.push(key)
    }
    this.saveProgress(progress)
  },

  /**
   * 檢查課節是否已完成
   * @param {string} levelId - 關卡 ID
   * @param {string} lessonId - 課節 ID
   * @returns {boolean}
   */
  isLessonComplete(levelId, lessonId) {
    const progress = this.getProgress()
    const key = `${levelId}-${lessonId}`
    return progress.completedLessons.includes(key)
  },

  /**
   * 儲存測驗成績
   * @param {string} quizId - 測驗 ID
   * @param {number} score - 分數 (0-100)
   * @param {boolean} passed - 是否通過
   */
  saveQuizScore(quizId, score, passed) {
    const progress = this.getProgress()
    progress.quizScores[quizId] = {
      score,
      passed,
      timestamp: new Date().toISOString(),
      attempts: (progress.quizScores[quizId]?.attempts || 0) + 1
    }
    this.saveProgress(progress)
  },

  /**
   * 取得測驗成績
   * @param {string} quizId - 測驗 ID
   * @returns {Object|null} 測驗成績或 null
   */
  getQuizScore(quizId) {
    const progress = this.getProgress()
    return progress.quizScores[quizId] || null
  },

  /**
   * 標記關卡完成
   * @param {string} levelId - 關卡 ID (e.g., 'level1')
   */
  markLevelComplete(levelId) {
    const progress = this.getProgress()
    if (!progress.completedLevels) {
      progress.completedLevels = []
    }
    if (!progress.completedLevels.includes(levelId)) {
      progress.completedLevels.push(levelId)
    }
    this.saveProgress(progress)
  },

  /**
   * 檢查關卡是否已完成
   * @param {string} levelId - 關卡 ID
   * @returns {boolean}
   */
  isLevelComplete(levelId) {
    const progress = this.getProgress()
    return progress.completedLevels?.includes(levelId) || false
  },

  /**
   * 解鎖新關卡
   * @param {number} levelNumber - 關卡編號
   */
  unlockLevel(levelNumber) {
    const progress = this.getProgress()
    if (!progress.unlockedLevels.includes(levelNumber)) {
      progress.unlockedLevels.push(levelNumber)
      progress.unlockedLevels.sort((a, b) => a - b)
    }
    this.saveProgress(progress)
  },

  /**
   * 檢查關卡是否已解鎖
   * @param {number} levelNumber - 關卡編號
   * @returns {boolean}
   */
  isLevelUnlocked(levelNumber) {
    const progress = this.getProgress()
    return progress.unlockedLevels.includes(levelNumber)
  },

  /**
   * 增加學習時間
   * @param {number} milliseconds - 增加的毫秒數
   */
  addLearningTime(milliseconds) {
    const progress = this.getProgress()
    progress.totalTimeSpent += milliseconds
    this.saveProgress(progress)
  },

  /**
   * 取得學習統計
   * @returns {Object} 統計資訊
   */
  getStatistics() {
    const progress = this.getProgress()
    const totalLessons = progress.completedLessons.length
    const totalQuizzes = Object.keys(progress.quizScores).length
    const passedQuizzes = Object.values(progress.quizScores).filter(q => q.passed).length
    const avgScore = totalQuizzes > 0
      ? Object.values(progress.quizScores).reduce((sum, q) => sum + q.score, 0) / totalQuizzes
      : 0

    return {
      totalLessons,
      totalQuizzes,
      passedQuizzes,
      avgScore: Math.round(avgScore),
      totalTimeSpent: progress.totalTimeSpent,
      currentLevel: progress.currentLevel,
      unlockedLevels: progress.unlockedLevels.length
    }
  },

  /**
   * 計算總體進度百分比
   * @param {number} totalLessonsInCurriculum - 課程總課節數
   * @returns {number} 進度百分比 (0-100)
   */
  getOverallProgress(totalLessonsInCurriculum = 20) {
    const progress = this.getProgress()
    return Math.round((progress.completedLessons.length / totalLessonsInCurriculum) * 100)
  },

  /**
   * 重置所有進度（需要確認）
   */
  resetProgress() {
    localStorage.removeItem(STORAGE_KEY)
  },

  /**
   * 匯出進度（用於備份）
   * @returns {string} JSON 字串
   */
  exportProgress() {
    return localStorage.getItem(STORAGE_KEY) || JSON.stringify(DEFAULT_PROGRESS)
  },

  /**
   * 匯入進度（用於還原）
   * @param {string} jsonString - JSON 字串
   * @returns {boolean} 是否成功
   */
  importProgress(jsonString) {
    try {
      const data = JSON.parse(jsonString)
      // 驗證資料結構
      if (typeof data.currentLevel === 'number' && Array.isArray(data.completedLessons)) {
        localStorage.setItem(STORAGE_KEY, jsonString)
        return true
      }
    } catch (error) {
      console.error('匯入進度失敗:', error)
    }
    return false
  }
}

export default LearningStorage
