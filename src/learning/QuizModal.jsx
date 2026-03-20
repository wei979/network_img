/**
 * QuizModal.jsx - 課程測驗彈窗
 *
 * 在學習模式完成課程後顯示測驗
 * 支援多選題、計分、結果顯示
 */

import React, { useState, useCallback, useMemo } from 'react'
import {
  X,
  CheckCircle2,
  XCircle,
  Trophy,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  BookOpen,
  Target,
  Award,
  AlertCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { LearningStorage } from './LearningStorage'
import { S } from '../lib/swiss-tokens'

/**
 * 單一問題組件
 */
function QuestionCard({
  question,
  questionNumber,
  totalQuestions,
  selectedAnswer,
  onSelectAnswer,
  showResult,
  isCorrect
}) {
  return (
    <div className="space-y-5">
      {/* 問題標題 */}
      <div className="flex items-start gap-4">
        <div
          className="flex-shrink-0 w-10 h-10 flex items-center justify-center"
          style={{
            borderRadius: S.radius.md,
            background: `${S.protocol.DNS}18`,
            border: `1px solid ${S.protocol.DNS}30`,
          }}
        >
          <span className="font-bold" style={{ color: S.protocol.DNS }}>{questionNumber}</span>
        </div>
        <div className="flex-1 pt-1.5">
          <p className="text-lg font-semibold leading-relaxed" style={{ color: S.text.primary }}>
            {question.question}
          </p>
        </div>
      </div>

      {/* 選項列表 */}
      <div className="space-y-3 pl-14">
        {question.options.map((option, index) => {
          const isSelected = selectedAnswer === index
          const isCorrectAnswer = question.correctAnswer === index

          let bg = S.surface
          let borderColor = S.border
          let textColor = S.text.secondary

          if (showResult) {
            if (isCorrectAnswer) {
              bg = `${S.protocol.HTTP}12`
              borderColor = `${S.protocol.HTTP}50`
              textColor = S.protocol.HTTP
            } else if (isSelected && !isCorrectAnswer) {
              bg = `${S.protocol.ICMP}12`
              borderColor = `${S.protocol.ICMP}50`
              textColor = S.protocol.ICMP
            } else {
              bg = S.surface
              borderColor = `${S.border}80`
              textColor = S.text.faint
            }
          } else if (isSelected) {
            bg = `${S.protocol.DNS}12`
            borderColor = `${S.protocol.DNS}50`
            textColor = S.protocol.DNS
          }

          return (
            <button
              key={index}
              onClick={() => !showResult && onSelectAnswer(index)}
              disabled={showResult}
              className="w-full p-4 transition-all duration-300 flex items-center gap-4 text-left"
              style={{
                borderRadius: S.radius.md,
                background: bg,
                border: `1px solid ${borderColor}`,
                cursor: showResult ? 'default' : 'pointer',
              }}
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                style={{
                  border: `2px solid ${
                    showResult && isCorrectAnswer ? S.protocol.HTTP
                    : showResult && isSelected && !isCorrectAnswer ? S.protocol.ICMP
                    : isSelected ? S.protocol.DNS
                    : S.text.tertiary
                  }`,
                  background:
                    showResult && isCorrectAnswer ? S.protocol.HTTP
                    : showResult && isSelected && !isCorrectAnswer ? S.protocol.ICMP
                    : 'transparent',
                }}
              >
                {showResult && isCorrectAnswer && (
                  <CheckCircle2 className="w-4 h-4" style={{ color: '#fff' }} />
                )}
                {showResult && isSelected && !isCorrectAnswer && (
                  <XCircle className="w-4 h-4" style={{ color: '#fff' }} />
                )}
                {!showResult && isSelected && (
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: S.protocol.DNS }} />
                )}
              </div>
              <span className="text-sm font-medium" style={{ color: textColor }}>
                {option}
              </span>
            </button>
          )
        })}
      </div>

      {/* 解釋（答題後顯示）*/}
      {showResult && question.explanation && (
        <div
          className="ml-14 p-4"
          style={{
            borderRadius: S.radius.md,
            background: isCorrect ? `${S.protocol.HTTP}0c` : `${S.accent}0c`,
            border: `1px solid ${isCorrect ? `${S.protocol.HTTP}30` : `${S.accent}30`}`,
          }}
        >
          <div className="flex items-start gap-3">
            <BookOpen className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: isCorrect ? S.protocol.HTTP : S.accent }} />
            <p className="text-sm leading-relaxed" style={{ color: isCorrect ? S.protocol.HTTP : S.accent }}>
              {question.explanation}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * 結果頁面組件
 */
function ResultPage({ score, totalQuestions, passingScore, onRetry, onClose, wrongAnswerList = [] }) {
  const percentage = Math.round((score / totalQuestions) * 100)
  const passed = percentage >= passingScore
  const [showWrongAnswers, setShowWrongAnswers] = useState(true)

  return (
    <div className="flex flex-col items-center py-6 space-y-5">
      {/* 結果圖示 */}
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center"
        style={{
          background: passed ? S.protocol.HTTP : S.accent,
        }}
      >
        {passed ? (
          <Trophy className="w-10 h-10" style={{ color: '#fff' }} />
        ) : (
          <Target className="w-10 h-10" style={{ color: '#fff' }} />
        )}
      </div>

      {/* 結果文字 */}
      <div className="text-center space-y-1">
        <h3 className="text-xl font-bold" style={{ color: passed ? S.protocol.HTTP : S.accent }}>
          {passed ? '恭喜通過！' : '再接再厲！'}
        </h3>
        <p className="text-sm" style={{ color: S.text.secondary }}>
          {passed
            ? '你已經掌握了這個章節的知識'
            : `需要 ${passingScore}% 才能通過測驗`
          }
        </p>
      </div>

      {/* 分數顯示 - 緊湊版 */}
      <div className="flex items-center gap-6">
        <div className="text-center">
          <div className="text-3xl font-bold" style={{ color: S.text.primary, fontFamily: S.font.serif }}>{score}</div>
          <div className="text-xs" style={{ color: S.text.tertiary }}>正確題數</div>
        </div>
        <div className="text-3xl" style={{ color: S.text.faint }}>/</div>
        <div className="text-center">
          <div className="text-3xl font-bold" style={{ color: S.text.secondary, fontFamily: S.font.serif }}>{totalQuestions}</div>
          <div className="text-xs" style={{ color: S.text.tertiary }}>總題數</div>
        </div>
        <div className="pl-4" style={{ borderLeft: `1px solid ${S.border}` }}>
          <div className="text-3xl font-bold" style={{ color: passed ? S.protocol.HTTP : S.accent, fontFamily: S.font.serif }}>
            {percentage}%
          </div>
          <div className="text-xs" style={{ color: S.text.tertiary }}>得分率</div>
        </div>
      </div>

      {/* 錯題區域 */}
      {wrongAnswerList.length > 0 && (
        <div className="w-full max-w-2xl">
          {/* 錯題標題 - 可收合 */}
          <button
            onClick={() => setShowWrongAnswers(prev => !prev)}
            className="w-full flex items-center justify-between p-3 transition-colors"
            style={{
              borderRadius: `${S.radius.md}px ${S.radius.md}px ${showWrongAnswers ? 0 : S.radius.md}px ${showWrongAnswers ? 0 : S.radius.md}px`,
              background: `${S.protocol.ICMP}10`,
              border: `1px solid ${S.protocol.ICMP}30`,
            }}
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" style={{ color: S.protocol.ICMP }} />
              <span className="font-medium" style={{ color: S.protocol.ICMP }}>
                錯誤題目 ({wrongAnswerList.length} 題)
              </span>
            </div>
            {showWrongAnswers ? (
              <ChevronUp className="w-5 h-5" style={{ color: S.protocol.ICMP }} />
            ) : (
              <ChevronDown className="w-5 h-5" style={{ color: S.protocol.ICMP }} />
            )}
          </button>

          {/* 錯題列表 */}
          {showWrongAnswers && (
            <div
              className="max-h-60 overflow-y-auto"
              style={{
                border: `1px solid ${S.protocol.ICMP}30`,
                borderTop: 'none',
                borderRadius: `0 0 ${S.radius.md}px ${S.radius.md}px`,
                background: S.surface,
              }}
            >
              {wrongAnswerList.map((wrong, idx) => (
                <div
                  key={wrong.questionId}
                  className="p-4"
                  style={{ borderTop: idx > 0 ? `1px solid ${S.border}` : 'none' }}
                >
                  {/* 題目 */}
                  <p className="text-sm font-medium mb-3" style={{ color: S.text.primary }}>
                    <span className="mr-2" style={{ color: S.text.tertiary }}>Q{idx + 1}.</span>
                    {wrong.question}
                  </p>

                  {/* 答案對比 */}
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: S.protocol.ICMP }} />
                      <div>
                        <span style={{ color: S.text.tertiary }}>你的答案：</span>
                        <span className="ml-1" style={{ color: S.protocol.ICMP }}>
                          {wrong.options[wrong.userAnswer] || '未作答'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: S.protocol.HTTP }} />
                      <div>
                        <span style={{ color: S.text.tertiary }}>正確答案：</span>
                        <span className="ml-1" style={{ color: S.protocol.HTTP }}>
                          {wrong.options[wrong.correctAnswer]}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 解釋 */}
                  {wrong.explanation && (
                    <div
                      className="mt-3 p-3"
                      style={{
                        borderRadius: S.radius.sm,
                        background: `${S.accent}0c`,
                        border: `1px solid ${S.accent}20`,
                      }}
                    >
                      <div className="flex items-start gap-2">
                        <BookOpen className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: S.accent }} />
                        <p className="text-xs leading-relaxed" style={{ color: S.accent }}>
                          {wrong.explanation}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 操作按鈕 */}
      <div className="flex gap-4 pt-2">
        {!passed && (
          <button
            onClick={onRetry}
            className="px-5 py-2.5 flex items-center gap-2 text-sm transition-colors"
            style={{
              borderRadius: S.radius.md,
              border: `1px solid ${S.border}`,
              color: S.text.secondary,
            }}
          >
            <RotateCcw className="w-4 h-4" />
            重新測驗
          </button>
        )}
        <button
          onClick={onClose}
          className="px-5 py-2.5 font-semibold transition-all flex items-center gap-2 text-sm"
          style={{
            borderRadius: S.radius.md,
            background: passed ? S.protocol.HTTP : S.surface,
            color: passed ? '#fff' : S.text.primary,
            border: passed ? 'none' : `1px solid ${S.border}`,
          }}
        >
          {passed ? (
            <>
              <Award className="w-4 h-4" />
              完成課程
            </>
          ) : (
            '稍後再試'
          )}
        </button>
      </div>
    </div>
  )
}

/**
 * QuizModal 主組件
 */
export default function QuizModal({
  quiz,              // 測驗定義
  onClose,           // 關閉回調
  onComplete,        // 完成回調（傳入分數和是否通過）
  isVisible = false
}) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState({})  // { questionId: answerIndex }
  const [showResults, setShowResults] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [wrongAnswerList, setWrongAnswerList] = useState([])  // 本次測驗的錯題列表

  // 計算分數
  const score = useMemo(() => {
    if (!quiz?.questions) return 0
    return quiz.questions.reduce((acc, q) => {
      return acc + (answers[q.id] === q.correctAnswer ? 1 : 0)
    }, 0)
  }, [quiz, answers])

  const totalQuestions = quiz?.questions?.length || 0
  const currentQuestion = quiz?.questions?.[currentQuestionIndex]
  const allAnswered = Object.keys(answers).length === totalQuestions

  // 選擇答案
  const handleSelectAnswer = useCallback((answerIndex) => {
    if (!currentQuestion) return
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: answerIndex
    }))
  }, [currentQuestion])

  // 下一題
  const handleNext = useCallback(() => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
    }
  }, [currentQuestionIndex, totalQuestions])

  // 上一題
  const handlePrev = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1)
    }
  }, [currentQuestionIndex])

  // 提交測驗
  const handleSubmit = useCallback(() => {
    setSubmitted(true)
    setShowResults(true)

    // 收集並儲存錯題
    if (quiz?.questions && quiz?.id) {
      const wrongAnswers = quiz.questions
        .filter(q => answers[q.id] !== q.correctAnswer)
        .map(q => ({
          questionId: q.id,
          question: q.question,
          options: q.options,
          userAnswer: answers[q.id],
          correctAnswer: q.correctAnswer,
          explanation: q.explanation
        }))

      // 設定到 state 以便在結果畫面顯示
      setWrongAnswerList(wrongAnswers)

      if (wrongAnswers.length > 0) {
        LearningStorage.saveWrongAnswers(quiz.id, wrongAnswers)
      }
    }
  }, [quiz, answers])

  // 重新測驗
  const handleRetry = useCallback(() => {
    setAnswers({})
    setCurrentQuestionIndex(0)
    setShowResults(false)
    setSubmitted(false)
    setWrongAnswerList([])
  }, [])

  // 完成並關閉
  const handleComplete = useCallback(() => {
    const percentage = Math.round((score / totalQuestions) * 100)
    const passed = percentage >= (quiz?.passingScore || 70)
    onComplete?.({ score, totalQuestions, percentage, passed })
    onClose?.()
  }, [score, totalQuestions, quiz?.passingScore, onComplete, onClose])

  if (!isVisible || !quiz) return null

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4">
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-black/85"
        onClick={onClose}
      />

      {/* 彈窗內容 */}
      <div
        className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col animate-fade-in-scale"
        style={{
          background: S.bgRaised,
          borderRadius: S.radius.lg,
          border: `1px solid ${S.accent}30`,
        }}
      >
        {/* 標題列 */}
        <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: `1px solid ${S.border}` }}>
          <div className="flex items-center gap-4">
            <div
              className="p-2.5"
              style={{
                borderRadius: S.radius.md,
                background: `${S.protocol.DNS}18`,
                border: `1px solid ${S.protocol.DNS}30`,
              }}
            >
              <Target className="w-6 h-6" style={{ color: S.protocol.DNS }} />
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: S.protocol.DNS }}>課程測驗</span>
              <h2 className="text-xl font-bold mt-0.5" style={{ color: S.text.primary }}>{quiz.title}</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 transition-all"
            style={{ borderRadius: S.radius.sm }}
            onMouseEnter={e => e.currentTarget.style.background = S.surfaceHover}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <X className="w-5 h-5" style={{ color: S.text.tertiary }} />
          </button>
        </div>

        {/* 進度條 */}
        {!showResults && (
          <div className="px-6 py-4" style={{ borderBottom: `1px solid ${S.border}` }}>
            <div className="flex items-center justify-between text-sm mb-3">
              <span className="font-medium" style={{ color: S.text.secondary }}>
                問題 <span style={{ color: S.protocol.DNS }}>{currentQuestionIndex + 1}</span> / {totalQuestions}
              </span>
              <span
                className="text-xs px-3 py-1 rounded-full"
                style={{ background: S.surface, color: S.text.tertiary }}
              >
                已答 {Object.keys(answers).length} 題
              </span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-bar-fill"
                style={{
                  width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%`,
                  background: `linear-gradient(90deg, ${S.accent} 0%, ${S.protocol.DNS} 100%)`
                }}
              />
            </div>
          </div>
        )}

        {/* 內容區域 */}
        <div className="flex-1 overflow-auto p-6">
          {showResults ? (
            <ResultPage
              score={score}
              totalQuestions={totalQuestions}
              passingScore={quiz.passingScore || 70}
              onRetry={handleRetry}
              onClose={handleComplete}
              wrongAnswerList={wrongAnswerList}
            />
          ) : currentQuestion ? (
            <QuestionCard
              question={currentQuestion}
              questionNumber={currentQuestionIndex + 1}
              totalQuestions={totalQuestions}
              selectedAnswer={answers[currentQuestion.id]}
              onSelectAnswer={handleSelectAnswer}
              showResult={submitted}
              isCorrect={answers[currentQuestion.id] === currentQuestion.correctAnswer}
            />
          ) : null}
        </div>

        {/* 底部操作列 */}
        {!showResults && (
          <div
            className="flex items-center justify-between px-6 py-4"
            style={{ borderTop: `1px solid ${S.border}`, background: `${S.bg}40` }}
          >
            <button
              onClick={handlePrev}
              disabled={currentQuestionIndex === 0}
              className="px-4 py-2.5 flex items-center gap-2 text-sm font-medium transition-all"
              style={{
                borderRadius: S.radius.md,
                color: currentQuestionIndex === 0 ? S.text.faint : S.text.secondary,
                cursor: currentQuestionIndex === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              <ChevronLeft className="w-4 h-4" />
              上一題
            </button>

            <div className="flex gap-1.5">
              {quiz.questions.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentQuestionIndex(index)}
                  className="w-8 h-8 text-xs font-semibold transition-all"
                  style={{
                    borderRadius: S.radius.sm,
                    background: index === currentQuestionIndex
                      ? S.protocol.DNS
                      : answers[quiz.questions[index].id] !== undefined
                        ? `${S.protocol.HTTP}20`
                        : S.surface,
                    color: index === currentQuestionIndex
                      ? '#fff'
                      : answers[quiz.questions[index].id] !== undefined
                        ? S.protocol.HTTP
                        : S.text.tertiary,
                    border: index === currentQuestionIndex
                      ? 'none'
                      : answers[quiz.questions[index].id] !== undefined
                        ? `1px solid ${S.protocol.HTTP}30`
                        : `1px solid ${S.border}`,
                  }}
                >
                  {index + 1}
                </button>
              ))}
            </div>

            {currentQuestionIndex === totalQuestions - 1 ? (
              <button
                onClick={handleSubmit}
                disabled={!allAnswered}
                className="px-5 py-2.5 font-semibold flex items-center gap-2 text-sm transition-all"
                style={{
                  borderRadius: S.radius.md,
                  background: allAnswered ? S.protocol.DNS : S.surface,
                  color: allAnswered ? '#fff' : S.text.faint,
                  cursor: allAnswered ? 'pointer' : 'not-allowed',
                }}
              >
                提交測驗
                <CheckCircle2 className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="px-4 py-2.5 text-sm font-medium flex items-center gap-2 transition-all"
                style={{
                  borderRadius: S.radius.md,
                  color: S.text.secondary,
                }}
              >
                下一題
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
