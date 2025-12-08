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
    <div className={`
      rounded-xl border transition-all duration-200
      ${wrongAnswer.masteredAt
        ? 'bg-emerald-500/10 border-emerald-500/30'
        : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
      }
    `}>
      {/* 卡片頭部 */}
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-start gap-3 text-left"
      >
        <div className={`
          flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
          ${wrongAnswer.masteredAt
            ? 'bg-emerald-500/20'
            : 'bg-red-500/20'
          }
        `}>
          {wrongAnswer.masteredAt ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <XCircle className="w-4 h-4 text-red-400" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-slate-500">{levelName}</span>
            {wrongAnswer.reviewCount > 0 && (
              <span className="text-xs text-amber-400">
                已複習 {wrongAnswer.reviewCount} 次
              </span>
            )}
          </div>
          <p className="text-white font-medium line-clamp-2">
            {wrongAnswer.question}
          </p>
        </div>

        <div className="flex-shrink-0">
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
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

              let optionStyle = 'border-slate-600 hover:border-cyan-500/50'

              if (hasAnswered || showAnswer) {
                if (isCorrectAnswer) {
                  optionStyle = 'border-emerald-500 bg-emerald-500/20'
                } else if (isSelected && !isCorrectAnswer) {
                  optionStyle = 'border-red-500 bg-red-500/20'
                } else if (wasUserAnswer && !showAnswer) {
                  optionStyle = 'border-amber-500/50 bg-amber-500/10'
                } else {
                  optionStyle = 'border-slate-700 opacity-50'
                }
              } else if (isSelected) {
                optionStyle = 'border-cyan-500 bg-cyan-500/20'
              }

              return (
                <button
                  key={index}
                  onClick={() => handleSelectAnswer(index)}
                  disabled={hasAnswered || showAnswer}
                  className={`
                    w-full p-3 rounded-lg border-2 transition-all duration-200
                    flex items-center gap-3 text-left text-sm
                    ${optionStyle}
                    ${(hasAnswered || showAnswer) ? 'cursor-default' : 'cursor-pointer'}
                  `}
                >
                  <div className={`
                    w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0
                    ${isSelected ? 'border-cyan-400' : 'border-slate-500'}
                    ${(hasAnswered || showAnswer) && isCorrectAnswer ? 'border-emerald-400 bg-emerald-400' : ''}
                    ${(hasAnswered || showAnswer) && isSelected && !isCorrectAnswer ? 'border-red-400 bg-red-400' : ''}
                  `}>
                    {(hasAnswered || showAnswer) && isCorrectAnswer && (
                      <CheckCircle2 className="w-3 h-3 text-white" />
                    )}
                    {hasAnswered && isSelected && !isCorrectAnswer && (
                      <XCircle className="w-3 h-3 text-white" />
                    )}
                    {!hasAnswered && !showAnswer && isSelected && (
                      <div className="w-2 h-2 rounded-full bg-cyan-400" />
                    )}
                  </div>

                  <span className={`
                    ${(hasAnswered || showAnswer) && isCorrectAnswer ? 'text-emerald-300 font-medium' : ''}
                    ${hasAnswered && isSelected && !isCorrectAnswer ? 'text-red-300' : ''}
                    ${!hasAnswered && !showAnswer ? 'text-slate-200' : ''}
                  `}>
                    {option}
                  </span>

                  {showAnswer && wasUserAnswer && !isCorrectAnswer && (
                    <span className="ml-auto text-xs text-amber-400">你的答案</span>
                  )}
                </button>
              )
            })}
          </div>

          {/* 解釋 */}
          {(hasAnswered || showAnswer) && wrongAnswer.explanation && (
            <div className={`
              ml-11 p-3 rounded-lg border text-sm
              ${isCorrect
                ? 'bg-emerald-500/10 border-emerald-500/30'
                : 'bg-amber-500/10 border-amber-500/30'
              }
            `}>
              <div className="flex items-start gap-2">
                <BookOpen className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                  isCorrect ? 'text-emerald-400' : 'text-amber-400'
                }`} />
                <p className={isCorrect ? 'text-emerald-200' : 'text-amber-200'}>
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
                  className={`
                    px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-all
                    ${selectedAnswer !== null
                      ? 'bg-cyan-600 hover:bg-cyan-500 text-white'
                      : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                    }
                  `}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  確認答案
                </button>
              ) : (
                <>
                  {isCorrect ? (
                    <div className="flex items-center gap-2 text-emerald-400">
                      <Award className="w-4 h-4" />
                      <span className="text-sm font-medium">已掌握！</span>
                    </div>
                  ) : (
                    <button
                      onClick={handleReset}
                      className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm flex items-center gap-2"
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
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 彈窗內容 */}
      <div className="relative w-[90vw] max-w-2xl max-h-[85vh] bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col">
        {/* 標題列 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">錯題本</h2>
              <p className="text-xs text-slate-400">
                複習答錯的題目，強化薄弱環節
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* 統計資訊 */}
        {stats && (
          <div className="px-6 py-4 bg-slate-800/30 border-b border-slate-700/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{stats.total}</div>
                  <div className="text-xs text-slate-500">總錯題</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-emerald-400">{stats.mastered}</div>
                  <div className="text-xs text-slate-500">已掌握</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-400">{stats.unmastered}</div>
                  <div className="text-xs text-slate-500">待複習</div>
                </div>
              </div>

              {/* 掌握率進度條 */}
              <div className="w-32">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-500">掌握率</span>
                  <span className="text-emerald-400">{stats.masteryRate}%</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-500"
                    style={{ width: `${stats.masteryRate}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 工具列 */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-slate-700/50">
          {/* 篩選 */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-slate-700 border-none rounded-lg px-3 py-1.5 text-sm text-white focus:ring-2 focus:ring-cyan-500"
            >
              <option value="all">全部錯題</option>
              <option value="unmastered">待複習</option>
              <option value="mastered">已掌握</option>
            </select>
          </div>

          {/* 操作按鈕 */}
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={showAnswers}
                onChange={(e) => setShowAnswers(e.target.checked)}
                className="rounded bg-slate-700 border-slate-600 text-cyan-500 focus:ring-cyan-500"
              />
              顯示答案
            </label>

            {stats?.mastered > 0 && (
              <button
                onClick={handleClearMastered}
                className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-amber-400 transition-colors"
                title="清除已掌握"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}

            {stats?.total > 0 && (
              <button
                onClick={handleClearAll}
                className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-red-400 transition-colors"
                title="清除全部"
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
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                {filter === 'unmastered' ? '沒有待複習的錯題' : '沒有錯題記錄'}
              </h3>
              <p className="text-slate-400 text-sm">
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
          <div className="px-6 py-3 bg-slate-800/50 border-t border-slate-700 text-center">
            <p className="text-xs text-slate-500">
              💡 點擊題目展開後重新作答，答對即標記為「已掌握」
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
