/**
 * CourseSidebar.jsx - 課程進度側邊欄
 *
 * 在學習模式下顯示課程目錄和進度，包括：
 * - 關卡列表
 * - 課節進度
 * - 學習統計
 */

import React, { useState, useMemo } from 'react'
import { ChevronDown, ChevronRight, Check, Lock, Clock, BookOpen, Trophy, FileQuestion, Star, AlertCircle } from 'lucide-react'
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
  onOpenWrongAnswers,  // 新增：開啟錯題本回調
  quizResults = {},    // 新增：測驗結果
  isVisible = true
}) {
  const [expandedLevels, setExpandedLevels] = useState({ [currentLevelId]: true })
  const progress = LearningStorage.getProgress()

  // 取得錯題統計
  const wrongAnswerStats = useMemo(() => {
    return LearningStorage.getWrongAnswerStats()
  }, [])

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
    <div className="w-72 glass-card rounded-2xl m-3 h-[calc(100%-1.5rem)] overflow-y-auto custom-scrollbar">
      {/* 標題區塊 */}
      <div className="p-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 border border-cyan-500/30">
            <BookOpen className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="font-semibold text-white text-sm">課程目錄</h2>
            <span className="text-xs text-slate-400">總進度 {LearningStorage.getOverallProgress()}%</span>
          </div>
        </div>
        {/* 動畫進度條 */}
        <div className="progress-bar mt-4">
          <div
            className="progress-bar-fill"
            style={{ width: `${LearningStorage.getOverallProgress()}%` }}
          />
        </div>
      </div>

      {/* 關卡列表 */}
      <div className="p-3 space-y-2">
        {courseList.map((level, levelIndex) => {
          const isCurrentLevel = level.id === currentLevelId
          const unlocked = isUnlocked(level.id)
          const completion = getLevelCompletion(level.id)
          const isExpanded = expandedLevels[level.id]
          const course = getCourse(level.id)

          return (
            <div key={level.id} className="animate-fade-in-up" style={{ animationDelay: `${levelIndex * 50}ms` }}>
              {/* 關卡標題卡片 */}
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
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-300 group ${
                  isCurrentLevel
                    ? 'bg-gradient-to-r from-cyan-500/20 to-emerald-500/10 border border-cyan-500/40 shadow-lg shadow-cyan-500/10'
                    : unlocked
                      ? 'bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-white/10 hover-lift'
                      : 'opacity-40 cursor-not-allowed bg-slate-800/30'
                }`}
              >
                {/* 展開/收合圖示 */}
                <div className={`p-1.5 rounded-lg transition-all ${
                  isCurrentLevel ? 'bg-cyan-500/20' : 'bg-white/5 group-hover:bg-white/10'
                }`}>
                  {unlocked ? (
                    isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 text-cyan-400" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-400 transition-colors" />
                    )
                  ) : (
                    <Lock className="w-3.5 h-3.5 text-slate-500" />
                  )}
                </div>

                {/* 關卡圖示 */}
                <span className="text-xl">{level.icon}</span>

                {/* 關卡資訊 */}
                <div className="flex-1 text-left min-w-0">
                  <div className={`text-sm font-semibold tracking-wide ${
                    isCurrentLevel ? 'text-cyan-300' : 'text-white'
                  }`}>
                    Level {levelIndex + 1}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    {level.description.substring(0, 18)}...
                  </div>
                </div>

                {/* 完成狀態 */}
                {unlocked && completion === 100 ? (
                  <div className="p-1.5 rounded-lg bg-yellow-500/20">
                    <Trophy className="w-4 h-4 text-yellow-400" />
                  </div>
                ) : unlocked ? (
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-medium text-cyan-400">{completion}%</span>
                    <div className="w-10 h-1 bg-slate-700 rounded-full mt-1 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-full transition-all"
                        style={{ width: `${completion}%` }}
                      />
                    </div>
                  </div>
                ) : null}
              </button>

              {/* 課節列表（展開時顯示） */}
              {isExpanded && unlocked && course && (
                <div className="ml-4 mt-2 space-y-1.5 pl-3 border-l-2 border-white/5">
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
                        className={`w-full flex items-center gap-2.5 p-2.5 rounded-lg text-sm transition-all duration-200 group/lesson ${
                          isCurrentLesson
                            ? 'bg-cyan-500/15 border border-cyan-500/30 text-cyan-300'
                            : completed
                              ? 'bg-emerald-500/5 text-slate-300 hover:bg-emerald-500/10'
                              : 'text-slate-400 hover:bg-white/[0.03] hover:text-slate-200'
                        }`}
                      >
                        {/* 完成狀態圖示 */}
                        {completed ? (
                          <div className="w-5 h-5 rounded-full bg-emerald-500/25 flex items-center justify-center border border-emerald-500/40">
                            <Check className="w-3 h-3 text-emerald-400" />
                          </div>
                        ) : isCurrentLesson ? (
                          <div className="w-5 h-5 rounded-full bg-cyan-500/25 flex items-center justify-center border border-cyan-500/40">
                            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full border border-slate-600/50 flex items-center justify-center bg-slate-800/50 group-hover/lesson:border-slate-500 transition-colors">
                            <span className="text-[10px] text-slate-500 group-hover/lesson:text-slate-400">{lessonIndex + 1}</span>
                          </div>
                        )}

                        {/* 課節標題 */}
                        <span className="flex-1 text-left truncate text-[13px]">
                          {lesson.title}
                        </span>

                        {/* 步驟數標籤 */}
                        <span className="text-[10px] text-slate-500 bg-slate-800/50 px-1.5 py-0.5 rounded">
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
                          w-full flex items-center gap-2.5 p-2.5 mt-3 rounded-xl text-sm transition-all duration-300
                          border
                          ${quizPassed
                            ? 'bg-gradient-to-r from-emerald-500/15 to-green-500/10 border-emerald-500/40 text-emerald-300 shadow-lg shadow-emerald-500/10'
                            : 'bg-gradient-to-r from-purple-500/15 to-pink-500/10 border-purple-500/40 text-purple-300 hover:shadow-lg hover:shadow-purple-500/15 hover-lift'
                          }
                        `}
                      >
                        {/* 測驗圖示 */}
                        {quizPassed ? (
                          <div className="w-6 h-6 rounded-lg bg-emerald-500/25 flex items-center justify-center border border-emerald-500/40">
                            <Star className="w-3.5 h-3.5 text-emerald-400" />
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-lg bg-purple-500/25 flex items-center justify-center border border-purple-500/40">
                            <FileQuestion className="w-3.5 h-3.5 text-purple-400" />
                          </div>
                        )}

                        {/* 測驗標題 */}
                        <span className="flex-1 text-left font-medium">
                          {quizPassed ? '✓ 已通過測驗' : '🎯 開始測驗'}
                        </span>

                        {/* 分數 */}
                        {quizResult && (
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            quizPassed
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-amber-500/20 text-amber-400'
                          }`}>
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

      {/* 錯題本入口 */}
      {wrongAnswerStats.total > 0 && (
        <div className="px-4 py-4 border-t border-white/5">
          <button
            onClick={onOpenWrongAnswers}
            className="w-full flex items-center gap-3 p-4 rounded-xl transition-all duration-300
              bg-gradient-to-br from-red-500/10 via-orange-500/5 to-amber-500/10
              border border-red-500/20 hover:border-red-500/40
              hover:shadow-lg hover:shadow-red-500/10 hover-lift group"
          >
            <div className="relative">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-red-500/25 to-orange-500/15 flex items-center justify-center border border-red-500/30 group-hover:scale-105 transition-transform">
                <AlertCircle className="w-5 h-5 text-red-400" />
              </div>
              {/* 未掌握數量徽章 */}
              {wrongAnswerStats.unmastered > 0 && (
                <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg shadow-red-500/40 animate-pulse">
                  <span className="text-[10px] font-bold text-white">
                    {wrongAnswerStats.unmastered > 9 ? '9+' : wrongAnswerStats.unmastered}
                  </span>
                </div>
              )}
            </div>
            <div className="flex-1 text-left">
              <div className="text-sm font-semibold text-white">📝 錯題本</div>
              <div className="text-xs text-slate-400 mt-0.5">
                {wrongAnswerStats.unmastered > 0
                  ? `${wrongAnswerStats.unmastered} 題待複習`
                  : '✓ 全部已掌握'
                }
              </div>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                {wrongAnswerStats.masteryRate}%
              </div>
              <div className="text-[10px] text-slate-500">掌握率</div>
            </div>
          </button>
        </div>
      )}

      {/* 學習統計 */}
      <div className="p-4 border-t border-white/5 mt-auto">
        <div className="text-xs text-slate-400 mb-3 font-medium">📊 學習統計</div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/5 rounded-xl p-3 border border-cyan-500/20">
            <div className="text-[10px] text-cyan-400/70 uppercase tracking-wider">已完成</div>
            <div className="text-2xl font-bold text-cyan-300 mt-1">
              {progress.completedLessons.length}
            </div>
            <div className="text-[10px] text-slate-500">課節</div>
          </div>
          <div className="bg-gradient-to-br from-emerald-500/10 to-green-500/5 rounded-xl p-3 border border-emerald-500/20">
            <div className="text-[10px] text-emerald-400/70 uppercase tracking-wider">學習時間</div>
            <div className="text-2xl font-bold text-emerald-300 mt-1">
              {Math.round(progress.totalTimeSpent / 60000)}
            </div>
            <div className="text-[10px] text-slate-500">分鐘</div>
          </div>
        </div>
      </div>
    </div>
  )
}
