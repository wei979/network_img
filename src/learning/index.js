/**
 * learning/index.js - 學習模組主入口
 *
 * 統一導出學習系統的所有組件和功能
 */

// Context Provider
export { LearningModeProvider, useLearningMode, useLearningModeOptional } from './LearningModeProvider'

// 儲存管理
export { LearningStorage } from './LearningStorage'

// UI 組件
export { default as TutorialOverlay } from './TutorialOverlay'
export { default as CourseSidebar } from './CourseSidebar'
export { default as TheoryModal } from './TheoryModal'
export { default as QuizModal } from './QuizModal'
export { default as WrongAnswerReview } from './WrongAnswerReview'

// Hooks
export { useLearningActionDetector } from './useLearningActionDetector'

// 課程定義
export { courses, courseList, getCourse, getTotalSteps, getTotalLessons, isCourseAvailable } from './courses'

// 預設導出
export default {
  LearningModeProvider,
  LearningStorage,
  TutorialOverlay,
  CourseSidebar
}
