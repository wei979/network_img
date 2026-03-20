/**
 * WrongAnswerReview.jsx - 錯題回顧組件
 *
 * 功能：
 * - 顯示使用者答錯的題目列表
 * - 支援重新作答進行複習
 * - 追蹤複習進度與掌握狀態
 */

import React, { useState, useCallback, useMemo } from 'react'
import {
  X,
  BookOpen,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Trash2,
  Filter,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Award,
  RotateCcw
} from 'lucide-react'
import { LearningStorage } from './LearningStorage'
import { S } from '../lib/swiss-tokens'

/**
 * 單一錯題卡片組件
 */
function WrongAnswerCard({
  wrongAnswer,
  isExpanded,
  onToggle,
  onRetry,
  showAnswer = false
}) {
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [hasAnswered, setHasAnswered] = useState(false)
  const isCorrect = selectedAnswer === wrongAnswer.correctAnswer

  const handleSelectAnswer = (index) => {
    if (hasAnswered) return
    setSelectedAnswer(index)
  }

  const handleSubmitAnswer = () => {
    if (selectedAnswer === null) return
    setHasAnswered(true)

    // 如果答對了，標記為已掌握
    if (isCorrect) {
      LearningStorage.markWrongAnswerMastered(
        wrongAnswer.quizId,
        wrongAnswer.questionId
      )
    } else {
      // 增加複習次數
      LearningStorage.incrementReviewCount(
        wrongAnswer.quizId,
        wrongAnswer.questionId
      )
    }

    onRetry?.()
  }

  const handleReset = () => {
    setSelectedAnswer(null)
    setHasAnswered(false)
  }

  // 取得關卡名稱
  const levelName = useMemo(() => {
    const levelMatch = wrongAnswer.quizId?.match(/level(\d+)/)
    if (levelMatch) {
      const levelNum = levelMatch[1]
      const levelNames = {
        '1': 'Level 1: 入門',
        '2': 'Level 2: 核心',
        '3': 'Level 3: 進階',
        '4': 'Level 4: 專業',
        '5': 'Level 5: 專家'
      }
      return levelNames[levelNum] || `Level ${levelNum}`
    }
    return wrongAnswer.quizId
  }, [wrongAnswer.quizId])

  return (
    <div
      className="transition-all duration-200"
      style={{
        borderRadius: S.radius.md,
        background: wrongAnswer.masteredAt ? `${S.protocol.HTTP}0c` : S.surface,
        border: `1px solid ${wrongAnswer.masteredAt ? `${S.protocol.HTTP}30` : S.border}`,
      }}
    >
      {/* 卡片頭部 */}
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-start gap-3 text-left"
      >
        <div
          className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
          style={{
            background: wrongAnswer.masteredAt ? `${S.protocol.HTTP}20` : `${S.protocol.ICMP}20`,
          }}
        >
          {wrongAnswer.masteredAt ? (
            <CheckCircle2 className="w-4 h-4" style={{ color: S.protocol.HTTP }} />
          ) : (
            <XCircle className="w-4 h-4" style={{ color: S.protocol.ICMP }} />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs" style={{ color: S.text.tertiary }}>{levelName}</span>
            {wrongAnswer.reviewCount > 0 && (
              <span className="text-xs" style={{ color: S.accent }}>
                已複習 {wrongAnswer.reviewCount} 次
              </span>
            )}
          </div>
          <p className="font-medium line-clamp-2" style={{ color: S.text.primary }}>
            {wrongAnswer.question}
          </p>
        </div>

        <div className="flex-shrink-0">
          {isExpanded ? (
            <ChevronUp className="w-5 h-5" style={{ color: S.text.tertiary }} />
          ) : (
            <ChevronDown className="w-5 h-5" style={{ color: S.text.tertiary }} />
          )}
        </div>
      </button>

      {/* 展開內容 */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* 選項列表 */}
          <div className="space-y-2 pl-11">
            {wrongAnswer.options?.map((option, index) => {
              const isSelected = selectedAnswer === index
              const isCorrectAnswer = wrongAnswer.correctAnswer === index
              const wasUserAnswer = wrongAnswer.userAnswer === index

              let borderColor = S.border
              let bg = 'transparent'
              let textColor = S.text.secondary

              if (hasAnswered || showAnswer) {
                if (isCorrectAnswer) {
                  borderColor = S.protocol.HTTP
                  bg = `${S.protocol.HTTP}18`
                  textColor = S.protocol.HTTP
                } else if (isSelected && !isCorrectAnswer) {
                  borderColor = S.protocol.ICMP
                  bg = `${S.protocol.ICMP}18`
                  textColor = S.protocol.ICMP
                } else if (wasUserAnswer && !showAnswer) {
                  borderColor = `${S.accent}60`
                  bg = `${S.accent}0c`
                  textColor = S.accent
                } else {
                  borderColor = S.border
                  bg = 'transparent'
                  textColor = S.text.faint
                }
              } else if (isSelected) {
                borderColor = S.accent
                bg = `${S.accent}18`
                textColor = S.accent
              }

              return (
                <button
                  key={index}
                  onClick={() => handleSelectAnswer(index)}
                  disabled={hasAnswered || showAnswer}
                  className="w-full p-3 transition-all duration-200 flex items-center gap-3 text-left text-sm"
                  style={{
                    borderRadius: S.radius.sm,
                    border: `2px solid ${borderColor}`,
                    background: bg,
                    cursor: (hasAnswered || showAnswer) ? 'default' : 'pointer',
                  }}
                >
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{
                      border: `2px solid ${
                        (hasAnswered || showAnswer) && isCorrectAnswer ? S.protocol.HTTP
                        : (hasAnswered || showAnswer) && isSelected && !isCorrectAnswer ? S.protocol.ICMP
                        : isSelected ? S.accent
                        : S.text.tertiary
                      }`,
                      background:
                        (hasAnswered || showAnswer) && isCorrectAnswer ? S.protocol.HTTP
                        : (hasAnswered || showAnswer) && isSelected && !isCorrectAnswer ? S.protocol.ICMP
                        : 'transparent',
                    }}
                  >
                    {(hasAnswered || showAnswer) && isCorrectAnswer && (
                      <CheckCircle2 className="w-3 h-3" style={{ color: '#fff' }} />
                    )}
                    {hasAnswered && isSelected && !isCorrectAnswer && (
                      <XCircle className="w-3 h-3" style={{ color: '#fff' }} />
                    )}
                    {!hasAnswered && !showAnswer && isSelected && (
                      <div className="w-2 h-2 rounded-full" style={{ background: S.accent }} />
                    )}
                  </div>

                  <span style={{ color: textColor }}>
                    {option}
                  </span>

                  {showAnswer && wasUserAnswer && !isCorrectAnswer && (
                    <span className="ml-auto text-xs" style={{ color: S.accent }}>你的答案</span>
                  )}
                </button>
              )
            })}
          </div>

          {/* 解釋 */}
          {(hasAnswered || showAnswer) && wrongAnswer.explanation && (
            <div
              className="ml-11 p-3 text-sm"
              style={{
                borderRadius: S.radius.sm,
                background: isCorrect ? `${S.protocol.HTTP}0c` : `${S.accent}0c`,
                border: `1px solid ${isCorrect ? `${S.protocol.HTTP}30` : `${S.accent}30`}`,
              }}
            >
              <div className="flex items-start gap-2">
                <BookOpen className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: isCorrect ? S.protocol.HTTP : S.accent }} />
                <p style={{ color: isCorrect ? S.protocol.HTTP : S.accent }}>
                  {wrongAnswer.explanation}
                </p>
              </div>
            </div>
          )}

          {/* 操作按鈕 */}
          {!showAnswer && (
            <div className="flex items-center gap-2 pl-11">
              {!hasAnswered ? (
                <button
                  onClick={handleSubmitAnswer}
                  disabled={selectedAnswer === null}
                  className="px-4 py-2 font-medium text-sm flex items-center gap-2 transition-all"
                  style={{
                    borderRadius: S.radius.sm,
                    background: selectedAnswer !== null ? S.accent : S.surface,
                    color: selectedAnswer !== null ? '#fff' : S.text.faint,
                    cursor: selectedAnswer !== null ? 'pointer' : 'not-allowed',
                  }}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  確認答案
                </button>
              ) : (
                <>
                  {isCorrect ? (
                    <div className="flex items-center gap-2" style={{ color: S.protocol.HTTP }}>
                      <Award className="w-4 h-4" />
                      <span className="text-sm font-medium">已掌握！</span>
                    </div>
                  ) : (
                    <button
                      onClick={handleReset}
                      className="px-4 py-2 text-sm flex items-center gap-2"
                      style={{
                        borderRadius: S.radius.sm,
                        background: S.surface,
                        color: S.text.primary,
                        border: `1px solid ${S.border}`,
                      }}
                    >
                      <RotateCcw className="w-4 h-4" />
                      再試一次
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * WrongAnswerReview 主組件
 */
export default function WrongAnswerReview({
  isVisible = false,
  onClose
}) {
  const [wrongAnswers, setWrongAnswers] = useState([])
  const [stats, setStats] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [filter, setFilter] = useState('all') // 'all' | 'unmastered' | 'mastered'
  const [showAnswers, setShowAnswers] = useState(false)

  // 載入錯題數據
  const loadData = useCallback(() => {
    const options = {}
    if (filter === 'unmastered') {
      options.unmasteredOnly = true
    }
    setWrongAnswers(LearningStorage.getWrongAnswers(options))
    setStats(LearningStorage.getWrongAnswerStats())
  }, [filter])

  // 初始化載入
  React.useEffect(() => {
    if (isVisible) {
      loadData()
    }
  }, [isVisible, loadData])

  // 篩選後的錯題
  const filteredWrongAnswers = useMemo(() => {
    if (filter === 'mastered') {
      return wrongAnswers.filter(wa => wa.masteredAt)
    }
    return wrongAnswers
  }, [wrongAnswers, filter])

  const handleToggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id)
  }

  const handleClearMastered = () => {
    if (window.confirm('確定要清除所有已掌握的錯題嗎？')) {
      LearningStorage.clearMasteredWrongAnswers()
      loadData()
    }
  }

  const handleClearAll = () => {
    if (window.confirm('確定要清除所有錯題記錄嗎？此操作無法復原。')) {
      LearningStorage.clearAllWrongAnswers()
      loadData()
    }
  }

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center">
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-black/80"
        onClick={onClose}
      />

      {/* 彈窗內容 */}
      <div
        className="relative w-[90vw] max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
        style={{
          background: S.bgRaised,
          borderRadius: S.radius.lg,
          border: `1px solid ${S.border}`,
        }}
      >
        {/* 標題列 */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: `1px solid ${S.border}`, background: S.surface }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2" style={{ background: `${S.protocol.ICMP}20`, borderRadius: S.radius.sm }}>
              <AlertCircle className="w-5 h-5" style={{ color: S.protocol.ICMP }} />
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: S.text.primary }}>錯題本</h2>
              <p className="text-xs" style={{ color: S.text.secondary }}>
                複習答錯的題目，強化薄弱環節
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 transition-colors"
            style={{ borderRadius: S.radius.sm }}
            onMouseEnter={e => e.currentTarget.style.background = S.surfaceHover}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <X className="w-5 h-5" style={{ color: S.text.tertiary }} />
          </button>
        </div>

        {/* 統計資訊 */}
        {stats && (
          <div className="px-6 py-4" style={{ background: `${S.surface}80`, borderBottom: `1px solid ${S.border}80` }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold" style={{ color: S.text.primary, fontFamily: S.font.serif }}>{stats.total}</div>
                  <div className="text-xs" style={{ color: S.text.tertiary }}>總錯題</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold" style={{ color: S.protocol.HTTP, fontFamily: S.font.serif }}>{stats.mastered}</div>
                  <div className="text-xs" style={{ color: S.text.tertiary }}>已掌握</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold" style={{ color: S.accent, fontFamily: S.font.serif }}>{stats.unmastered}</div>
                  <div className="text-xs" style={{ color: S.text.tertiary }}>待複習</div>
                </div>
              </div>

              {/* 掌握率進度條 */}
              <div className="w-32">
                <div className="flex justify-between text-xs mb-1">
                  <span style={{ color: S.text.tertiary }}>掌握率</span>
                  <span style={{ color: S.protocol.HTTP }}>{stats.masteryRate}%</span>
                </div>
                <div className="h-2 overflow-hidden" style={{ background: S.border, borderRadius: 9999 }}>
                  <div
                    className="h-full transition-all duration-500"
                    style={{ width: `${stats.masteryRate}%`, background: S.protocol.HTTP, borderRadius: 9999 }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 工具列 */}
        <div
          className="flex items-center justify-between px-6 py-3"
          style={{ borderBottom: `1px solid ${S.border}80` }}
        >
          {/* 篩選 */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4" style={{ color: S.text.tertiary }} />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="border-none px-3 py-1.5 text-sm focus:outline-none"
              style={{
                background: S.surface,
                color: S.text.primary,
                borderRadius: S.radius.sm,
              }}
            >
              <option value="all">全部錯題</option>
              <option value="unmastered">待複習</option>
              <option value="mastered">已掌握</option>
            </select>
          </div>

          {/* 操作按鈕 */}
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: S.text.secondary }}>
              <input
                type="checkbox"
                checked={showAnswers}
                onChange={(e) => setShowAnswers(e.target.checked)}
                className="rounded"
                style={{ accentColor: S.accent }}
              />
              顯示答案
            </label>

            {stats?.mastered > 0 && (
              <button
                onClick={handleClearMastered}
                className="p-2 transition-colors"
                style={{ borderRadius: S.radius.sm, color: S.text.tertiary }}
                title="清除已掌握"
                onMouseEnter={e => { e.currentTarget.style.background = S.surfaceHover; e.currentTarget.style.color = S.accent }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = S.text.tertiary }}
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}

            {stats?.total > 0 && (
              <button
                onClick={handleClearAll}
                className="p-2 transition-colors"
                style={{ borderRadius: S.radius.sm, color: S.text.tertiary }}
                title="清除全部"
                onMouseEnter={e => { e.currentTarget.style.background = S.surfaceHover; e.currentTarget.style.color = S.protocol.ICMP }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = S.text.tertiary }}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* 錯題列表 */}
        <div className="flex-1 overflow-auto p-4 space-y-3">
          {filteredWrongAnswers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                style={{ background: `${S.protocol.HTTP}20` }}
              >
                <CheckCircle2 className="w-8 h-8" style={{ color: S.protocol.HTTP }} />
              </div>
              <h3 className="text-lg font-semibold mb-2" style={{ color: S.text.primary }}>
                {filter === 'unmastered' ? '沒有待複習的錯題' : '沒有錯題記錄'}
              </h3>
              <p className="text-sm" style={{ color: S.text.secondary }}>
                {filter === 'unmastered'
                  ? '太棒了！你已經掌握了所有錯題'
                  : '完成測驗後，答錯的題目會自動記錄在這裡'
                }
              </p>
            </div>
          ) : (
            filteredWrongAnswers.map((wrongAnswer) => (
              <WrongAnswerCard
                key={`${wrongAnswer.quizId}-${wrongAnswer.questionId}`}
                wrongAnswer={wrongAnswer}
                isExpanded={expandedId === `${wrongAnswer.quizId}-${wrongAnswer.questionId}`}
                onToggle={() => handleToggleExpand(`${wrongAnswer.quizId}-${wrongAnswer.questionId}`)}
                onRetry={loadData}
                showAnswer={showAnswers}
              />
            ))
          )}
        </div>

        {/* 底部提示 */}
        {filteredWrongAnswers.length > 0 && !showAnswers && (
          <div className="px-6 py-3 text-center" style={{ background: S.surface, borderTop: `1px solid ${S.border}` }}>
            <p className="text-xs" style={{ color: S.text.tertiary }}>
              點擊題目展開後重新作答，答對即標記為「已掌握」
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
