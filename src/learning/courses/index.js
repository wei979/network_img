/**
 * courses/index.js - 課程目錄導出
 *
 * 統一管理所有課程定義，提供課程載入和查詢功能
 */

import { level1Course } from './level1/course'
import { level2Course } from './level2/course'
import { level3Course } from './level3/course'
import { level4Course } from './level4/course'
import { level5Course } from './level5/course'

/**
 * 所有課程定義
 */
export const courses = {
  level1: level1Course,
  level2: level2Course,
  level3: level3Course,
  level4: level4Course,
  level5: level5Course,
}

/**
 * 課程列表（用於顯示目錄）
 */
export const courseList = [
  {
    id: 'level1',
    title: 'Level 1：認識介面與 OSI 基礎',
    description: '從網路基礎開始，認識 MindMap 工具介面。',
    estimatedTime: '30 分鐘',
    icon: '📚',
    color: 'emerald',
    unlockCondition: null,  // 預設解鎖
    lessonCount: 5
  },
  {
    id: 'level2',
    title: 'Level 2：傳輸層協議',
    description: '深入了解 TCP 與 UDP 協議的運作原理。',
    estimatedTime: '45 分鐘',
    icon: '🔄',
    color: 'blue',
    unlockCondition: 'level1-complete',
    lessonCount: 7
  },
  {
    id: 'level3',
    title: 'Level 3：應用層協議',
    description: '學習 HTTP、HTTPS、DNS 等常見協議。',
    estimatedTime: '45 分鐘',
    icon: '🌐',
    color: 'purple',
    unlockCondition: 'level2-complete',
    lessonCount: 6
  },
  {
    id: 'level4',
    title: 'Level 4：異常檢測與安全分析',
    description: '識別超時、攻擊流量等異常行為。',
    estimatedTime: '60 分鐘',
    icon: '🛡️',
    color: 'orange',
    unlockCondition: 'level3-complete',
    lessonCount: 6
  },
  {
    id: 'level5',
    title: 'Level 5：綜合實戰',
    description: '運用所學知識分析真實網路場景。',
    estimatedTime: '90 分鐘',
    icon: '🏆',
    color: 'red',
    unlockCondition: 'level4-complete',
    lessonCount: 4
  }
]

/**
 * 取得課程定義
 * @param {string} courseId - 課程 ID (e.g., 'level1')
 * @returns {Object|null} 課程定義或 null
 */
export function getCourse(courseId) {
  return courses[courseId] || null
}

/**
 * 取得課程的總步驟數
 * @param {string} courseId - 課程 ID
 * @returns {number} 總步驟數
 */
export function getTotalSteps(courseId) {
  const course = courses[courseId]
  if (!course) return 0
  return course.lessons.reduce((sum, lesson) => sum + lesson.steps.length, 0)
}

/**
 * 取得課程的總課節數
 * @param {string} courseId - 課程 ID
 * @returns {number} 總課節數
 */
export function getTotalLessons(courseId) {
  const course = courses[courseId]
  if (!course) return 0
  return course.lessons.length
}

/**
 * 檢查課程是否可用
 * @param {string} courseId - 課程 ID
 * @returns {boolean}
 */
export function isCourseAvailable(courseId) {
  return courseId in courses
}

export default courses
