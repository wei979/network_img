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
import { S } from '../lib/swiss-tokens'

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
    <div
      className="w-72 m-3 h-[calc(100%-1.5rem)] overflow-y-auto custom-scrollbar"
      style={{
        background: S.bgRaised,
        borderRadius: S.radius.md,
        border: `1px solid ${S.border}`,
      }}
    >
      {/* 標題區塊 */}
      <div className="p-5" style={{ borderBottom: `1px solid ${S.border}` }}>
        <div className="flex items-center gap-3">
          <div
            className="p-2"
            style={{
              borderRadius: S.radius.md,
              background: `${S.accent}18`,
              border: `1px solid ${S.accent}30`,
            }}
          >
            <BookOpen className="w-5 h-5" style={{ color: S.accent }} />
          </div>
          <div>
            <h2 className="font-semibold text-sm" style={{ color: S.text.primary, fontFamily: S.font.sans }}>課程目錄</h2>
            <span className="text-xs" style={{ color: S.text.secondary }}>總進度 {LearningStorage.getOverallProgress()}%</span>
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
                className="w-full flex items-center gap-3 p-3 transition-all duration-300 group"
                style={{
                  borderRadius: S.radius.md,
                  background: isCurrentLevel
                    ? `${S.accent}18`
                    : unlocked
                      ? S.surface
                      : `${S.bg}80`,
                  border: `1px solid ${
                    isCurrentLevel
                      ? `${S.accent}50`
                      : unlocked
                        ? S.border
                        : 'transparent'
                  }`,
                  opacity: !unlocked ? 0.4 : 1,
                  cursor: !unlocked ? 'not-allowed' : 'pointer',
                }}
              >
                {/* 展開/收合圖示 */}
                <div
                  className="p-1.5 transition-all"
                  style={{
                    borderRadius: S.radius.sm,
                    background: isCurrentLevel ? `${S.accent}20` : `${S.text.faint}30`,
                  }}
                >
                  {unlocked ? (
                    isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5" style={{ color: S.accent }} />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5" style={{ color: S.text.secondary }} />
                    )
                  ) : (
                    <Lock className="w-3.5 h-3.5" style={{ color: S.text.tertiary }} />
                  )}
                </div>

                {/* 關卡圖示 */}
                <span className="text-xl">{level.icon}</span>

                {/* 關卡資訊 */}
                <div className="flex-1 text-left min-w-0">
                  <div
                    className="text-sm font-semibold tracking-wide"
                    style={{ color: isCurrentLevel ? S.accent : S.text.primary }}
                  >
                    Level {levelIndex + 1}
                  </div>
                  <div className="text-[11px] truncate" style={{ color: S.text.secondary }}>
                    {level.description.substring(0, 18)}...
                  </div>
                </div>

                {/* 完成狀態 */}
                {unlocked && completion === 100 ? (
                  <div className="p-1.5" style={{ borderRadius: S.radius.sm, background: '#eab30820' }}>
                    <Trophy className="w-4 h-4" style={{ color: '#eab308' }} />
                  </div>
                ) : unlocked ? (
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-medium" style={{ color: S.accent }}>{completion}%</span>
                    <div className="w-10 h-1 mt-1 overflow-hidden" style={{ background: S.border, borderRadius: 9999 }}>
                      <div
                        className="h-full transition-all"
                        style={{ width: `${completion}%`, background: S.accent, borderRadius: 9999 }}
                      />
                    </div>
                  </div>
                ) : null}
              </button>

              {/* 課節列表（展開時顯示） */}
              {isExpanded && unlocked && course && (
                <div className="ml-4 mt-2 space-y-1.5 pl-3" style={{ borderLeft: `2px solid ${S.border}` }}>
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
                        className="w-full flex items-center gap-2.5 p-2.5 text-sm transition-all duration-200"
                        style={{
                          borderRadius: S.radius.sm,
                          background: isCurrentLesson
                            ? `${S.accent}18`
                            : completed
                              ? `${S.protocol.HTTP}08`
                              : 'transparent',
                          border: isCurrentLesson ? `1px solid ${S.accent}30` : '1px solid transparent',
                          color: isCurrentLesson
                            ? S.accent
                            : completed
                              ? S.text.secondary
                              : S.text.tertiary,
                        }}
                      >
                        {/* 完成狀態圖示 */}
                        {completed ? (
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center"
                            style={{ background: `${S.protocol.HTTP}20`, border: `1px solid ${S.protocol.HTTP}40` }}
                          >
                            <Check className="w-3 h-3" style={{ color: S.protocol.HTTP }} />
                          </div>
                        ) : isCurrentLesson ? (
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center"
                            style={{ background: `${S.accent}20`, border: `1px solid ${S.accent}40` }}
                          >
                            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: S.accent }} />
                          </div>
                        ) : (
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center transition-colors"
                            style={{ border: `1px solid ${S.border}`, background: `${S.surface}80` }}
                          >
                            <span className="text-[10px]" style={{ color: S.text.tertiary }}>{lessonIndex + 1}</span>
                          </div>
                        )}

                        {/* 課節標題 */}
                        <span className="flex-1 text-left truncate text-[13px]">
                          {lesson.title}
                        </span>

                        {/* 步驟數標籤 */}
                        <span
                          className="text-[10px] px-1.5 py-0.5"
                          style={{
                            color: S.text.tertiary,
                            background: S.surface,
                            borderRadius: S.radius.sm,
                          }}
                        >
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
                        className="w-full flex items-center gap-2.5 p-2.5 mt-3 text-sm transition-all duration-300"
                        style={{
                          borderRadius: S.radius.md,
                          background: quizPassed ? `${S.protocol.HTTP}12` : `${S.protocol.DNS}12`,
                          border: `1px solid ${quizPassed ? `${S.protocol.HTTP}40` : `${S.protocol.DNS}40`}`,
                          color: quizPassed ? S.protocol.HTTP : S.protocol.DNS,
                        }}
                      >
                        {/* 測驗圖示 */}
                        {quizPassed ? (
                          <div
                            className="w-6 h-6 flex items-center justify-center"
                            style={{ borderRadius: S.radius.sm, background: `${S.protocol.HTTP}20`, border: `1px solid ${S.protocol.HTTP}40` }}
                          >
                            <Star className="w-3.5 h-3.5" style={{ color: S.protocol.HTTP }} />
                          </div>
                        ) : (
                          <div
                            className="w-6 h-6 flex items-center justify-center"
                            style={{ borderRadius: S.radius.sm, background: `${S.protocol.DNS}20`, border: `1px solid ${S.protocol.DNS}40` }}
                          >
                            <FileQuestion className="w-3.5 h-3.5" style={{ color: S.protocol.DNS }} />
                          </div>
                        )}

                        {/* 測驗標題 */}
                        <span className="flex-1 text-left font-medium">
                          {quizPassed ? '✓ 已通過測驗' : '開始測驗'}
                        </span>

                        {/* 分數 */}
                        {quizResult && (
                          <span
                            className="text-xs font-semibold px-2 py-0.5 rounded-full"
                            style={{
                              background: quizPassed ? `${S.protocol.HTTP}20` : `${S.accent}20`,
                              color: quizPassed ? S.protocol.HTTP : S.accent,
                            }}
                          >
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
        <div className="px-4 py-4" style={{ borderTop: `1px solid ${S.border}` }}>
          <button
            onClick={onOpenWrongAnswers}
            className="w-full flex items-center gap-3 p-4 transition-all duration-300 group"
            style={{
              borderRadius: S.radius.md,
              background: `${S.protocol.ICMP}08`,
              border: `1px solid ${S.protocol.ICMP}20`,
            }}
          >
            <div className="relative">
              <div
                className="w-11 h-11 flex items-center justify-center group-hover:scale-105 transition-transform"
                style={{
                  borderRadius: S.radius.md,
                  background: `${S.protocol.ICMP}18`,
                  border: `1px solid ${S.protocol.ICMP}30`,
                }}
              >
                <AlertCircle className="w-5 h-5" style={{ color: S.protocol.ICMP }} />
              </div>
              {/* 未掌握數量徽章 */}
              {wrongAnswerStats.unmastered > 0 && (
                <div
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center animate-pulse"
                  style={{ background: S.protocol.ICMP }}
                >
                  <span className="text-[10px] font-bold" style={{ color: '#fff' }}>
                    {wrongAnswerStats.unmastered > 9 ? '9+' : wrongAnswerStats.unmastered}
                  </span>
                </div>
              )}
            </div>
            <div className="flex-1 text-left">
              <div className="text-sm font-semibold" style={{ color: S.text.primary }}>錯題本</div>
              <div className="text-xs mt-0.5" style={{ color: S.text.secondary }}>
                {wrongAnswerStats.unmastered > 0
                  ? `${wrongAnswerStats.unmastered} 題待複習`
                  : '✓ 全部已掌握'
                }
              </div>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold" style={{ color: S.accent, fontFamily: S.font.serif }}>
                {wrongAnswerStats.masteryRate}%
              </div>
              <div className="text-[10px]" style={{ color: S.text.tertiary }}>掌握率</div>
            </div>
          </button>
        </div>
      )}

      {/* 學習統計 */}
      <div className="p-4 mt-auto" style={{ borderTop: `1px solid ${S.border}` }}>
        <div className="text-xs mb-3 font-medium" style={{ color: S.text.secondary }}>學習統計</div>
        <div className="grid grid-cols-2 gap-3">
          <div
            className="p-3"
            style={{
              borderRadius: S.radius.md,
              background: `${S.accent}10`,
              border: `1px solid ${S.accent}20`,
            }}
          >
            <div className="text-[10px] uppercase tracking-wider" style={{ color: `${S.accent}90` }}>已完成</div>
            <div className="text-2xl font-bold mt-1" style={{ color: S.accent, fontFamily: S.font.serif }}>
              {progress.completedLessons.length}
            </div>
            <div className="text-[10px]" style={{ color: S.text.tertiary }}>課節</div>
          </div>
          <div
            className="p-3"
            style={{
              borderRadius: S.radius.md,
              background: `${S.protocol.HTTP}10`,
              border: `1px solid ${S.protocol.HTTP}20`,
            }}
          >
            <div className="text-[10px] uppercase tracking-wider" style={{ color: `${S.protocol.HTTP}90` }}>學習時間</div>
            <div className="text-2xl font-bold mt-1" style={{ color: S.protocol.HTTP, fontFamily: S.font.serif }}>
              {Math.round(progress.totalTimeSpent / 60000)}
            </div>
            <div className="text-[10px]" style={{ color: S.text.tertiary }}>分鐘</div>
          </div>
        </div>
      </div>
    </div>
  )
}
