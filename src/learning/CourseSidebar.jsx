/**
 * CourseSidebar.jsx - 課程進度側邊欄
 *
 * 在學習模式下顯示課程目錄和進度，包括：
 * - 關卡列表
 * - 課節進度
 * - 學習統計
 */

import React, { useState } from 'react'
import { ChevronDown, ChevronRight, Check, Lock, Clock, BookOpen, Trophy, FileQuestion, Star } from 'lucide-react'
import { courseList, getCourse } from './courses'
import { LearningStorage } from './LearningStorage'

/**
 * CourseSidebar 課程側邊欄組件
 */
export default function CourseSidebar({
  currentLevelId,
  currentLessonIndex,
  onSelectLevel,
  onSelectLesson,
  onStartQuiz,         // 新增：開始測驗回調
  quizResults = {},    // 新增：測驗結果
  isVisible = true
}) {
  const [expandedLevels, setExpandedLevels] = useState({ [currentLevelId]: true })
  const progress = LearningStorage.getProgress()

  // 切換關卡展開狀態
  const toggleLevel = (levelId) => {
    setExpandedLevels(prev => ({
      ...prev,
      [levelId]: !prev[levelId]
    }))
  }

  // 檢查關卡是否已解鎖
  const isUnlocked = (levelId) => {
    const levelNumber = parseInt(levelId.replace('level', ''))
    return progress.unlockedLevels.includes(levelNumber)
  }

  // 計算關卡完成百分比
  const getLevelCompletion = (levelId) => {
    const course = getCourse(levelId)
    if (!course) return 0
    const completedLessons = progress.completedLessons.filter(
      key => key.startsWith(levelId)
    ).length
    return Math.round((completedLessons / course.lessons.length) * 100)
  }

  // 檢查課節是否已完成
  const isLessonComplete = (levelId, lessonId) => {
    return progress.completedLessons.includes(`${levelId}-${lessonId}`)
  }

  if (!isVisible) return null

  return (
    <div className="w-64 bg-slate-800/90 backdrop-blur-sm border-r border-slate-700 h-full overflow-y-auto">
      {/* 標題 */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center gap-2 text-cyan-300">
          <BookOpen className="w-5 h-5" />
          <span className="font-semibold">課程目錄</span>
        </div>
        <div className="mt-2 text-xs text-slate-400">
          總進度: {LearningStorage.getOverallProgress()}%
        </div>
        <div className="mt-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all duration-500"
            style={{ width: `${LearningStorage.getOverallProgress()}%` }}
          />
        </div>
      </div>

      {/* 關卡列表 */}
      <div className="p-2">
        {courseList.map((level, levelIndex) => {
          const isCurrentLevel = level.id === currentLevelId
          const unlocked = isUnlocked(level.id)
          const completion = getLevelCompletion(level.id)
          const isExpanded = expandedLevels[level.id]
          const course = getCourse(level.id)

          return (
            <div key={level.id} className="mb-2">
              {/* 關卡標題 */}
              <button
                onClick={() => {
                  if (unlocked) {
                    toggleLevel(level.id)
                    if (!isCurrentLevel) {
                      onSelectLevel?.(level.id)
                    }
                  }
                }}
                disabled={!unlocked}
                className={`w-full flex items-center gap-2 p-3 rounded-lg transition-all ${
                  isCurrentLevel
                    ? 'bg-cyan-600/30 border border-cyan-500/50'
                    : unlocked
                      ? 'hover:bg-slate-700/50'
                      : 'opacity-50 cursor-not-allowed'
                }`}
              >
                {/* 展開/收合圖示 */}
                {unlocked ? (
                  isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  )
                ) : (
                  <Lock className="w-4 h-4 text-slate-500" />
                )}

                {/* 關卡圖示 */}
                <span className="text-lg">{level.icon}</span>

                {/* 關卡資訊 */}
                <div className="flex-1 text-left">
                  <div className={`text-sm font-medium ${
                    isCurrentLevel ? 'text-cyan-300' : 'text-slate-200'
                  }`}>
                    Level {levelIndex + 1}
                  </div>
                  <div className="text-xs text-slate-400 truncate">
                    {level.description.substring(0, 20)}...
                  </div>
                </div>

                {/* 完成狀態 */}
                {unlocked && completion === 100 ? (
                  <Trophy className="w-4 h-4 text-yellow-400" />
                ) : unlocked ? (
                  <span className="text-xs text-slate-400">{completion}%</span>
                ) : null}
              </button>

              {/* 課節列表（展開時顯示） */}
              {isExpanded && unlocked && course && (
                <div className="ml-6 mt-1 space-y-1">
                  {course.lessons.map((lesson, lessonIndex) => {
                    const isCurrentLesson = isCurrentLevel && lessonIndex === currentLessonIndex
                    const completed = isLessonComplete(level.id, lesson.id)

                    return (
                      <button
                        key={lesson.id}
                        onClick={() => {
                          if (isCurrentLevel) {
                            onSelectLesson?.(lessonIndex)
                          } else {
                            onSelectLevel?.(level.id)
                            setTimeout(() => onSelectLesson?.(lessonIndex), 100)
                          }
                        }}
                        className={`w-full flex items-center gap-2 p-2 rounded-lg text-sm transition-all ${
                          isCurrentLesson
                            ? 'bg-cyan-600/20 text-cyan-300'
                            : 'text-slate-300 hover:bg-slate-700/30'
                        }`}
                      >
                        {/* 完成狀態圖示 */}
                        {completed ? (
                          <div className="w-5 h-5 rounded-full bg-emerald-500/30 flex items-center justify-center">
                            <Check className="w-3 h-3 text-emerald-400" />
                          </div>
                        ) : isCurrentLesson ? (
                          <div className="w-5 h-5 rounded-full bg-cyan-500/30 flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full border border-slate-600 flex items-center justify-center">
                            <span className="text-xs text-slate-500">{lessonIndex + 1}</span>
                          </div>
                        )}

                        {/* 課節標題 */}
                        <span className="flex-1 text-left truncate">
                          {lesson.title}
                        </span>

                        {/* 步驟數 */}
                        <span className="text-xs text-slate-500">
                          {lesson.steps.length} 步
                        </span>
                      </button>
                    )
                  })}

                  {/* 測驗按鈕 - 當課程有測驗且所有課節完成時顯示 */}
                  {course.quiz && (() => {
                    const allLessonsComplete = course.lessons.every(
                      lesson => isLessonComplete(level.id, lesson.id)
                    )
                    const quizResult = quizResults[level.id]
                    const quizPassed = quizResult?.passed

                    if (!allLessonsComplete && !quizResult) return null

                    return (
                      <button
                        onClick={() => onStartQuiz?.(course.quiz, level.id)}
                        className={`
                          w-full flex items-center gap-2 p-2 mt-2 rounded-lg text-sm transition-all
                          border-2 border-dashed
                          ${quizPassed
                            ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
                            : 'border-purple-500/50 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20'
                          }
                        `}
                      >
                        {/* 測驗圖示 */}
                        {quizPassed ? (
                          <div className="w-5 h-5 rounded-full bg-emerald-500/30 flex items-center justify-center">
                            <Star className="w-3 h-3 text-emerald-400" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-purple-500/30 flex items-center justify-center">
                            <FileQuestion className="w-3 h-3 text-purple-400" />
                          </div>
                        )}

                        {/* 測驗標題 */}
                        <span className="flex-1 text-left">
                          {quizPassed ? '已通過測驗' : '開始測驗'}
                        </span>

                        {/* 分數 */}
                        {quizResult && (
                          <span className={`text-xs ${quizPassed ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {quizResult.percentage}%
                          </span>
                        )}
                      </button>
                    )
                  })()}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 學習統計 */}
      <div className="p-4 border-t border-slate-700 mt-auto">
        <div className="text-xs text-slate-400 mb-2">學習統計</div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-slate-700/50 rounded-lg p-2">
            <div className="text-slate-400">已完成課節</div>
            <div className="text-lg font-semibold text-cyan-300">
              {progress.completedLessons.length}
            </div>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-2">
            <div className="text-slate-400">學習時間</div>
            <div className="text-lg font-semibold text-emerald-300">
              {Math.round(progress.totalTimeSpent / 60000)}分
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
