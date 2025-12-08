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
    <div className="space-y-4">
      {/* 問題標題 */}
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center">
          <span className="text-cyan-400 font-bold text-sm">{questionNumber}</span>
        </div>
        <div className="flex-1">
          <p className="text-white text-lg font-medium leading-relaxed">
            {question.question}
          </p>
        </div>
      </div>

      {/* 選項列表 */}
      <div className="space-y-2 pl-11">
        {question.options.map((option, index) => {
          const isSelected = selectedAnswer === index
          const isCorrectAnswer = question.correctAnswer === index

          let optionStyle = 'border-slate-600 hover:border-cyan-500/50 hover:bg-slate-700/50'

          if (showResult) {
            if (isCorrectAnswer) {
              optionStyle = 'border-emerald-500 bg-emerald-500/20'
            } else if (isSelected && !isCorrectAnswer) {
              optionStyle = 'border-red-500 bg-red-500/20'
            } else {
              optionStyle = 'border-slate-700 opacity-50'
            }
          } else if (isSelected) {
            optionStyle = 'border-cyan-500 bg-cyan-500/20'
          }

          return (
            <button
              key={index}
              onClick={() => !showResult && onSelectAnswer(index)}
              disabled={showResult}
              className={`
                w-full p-4 rounded-xl border-2 transition-all duration-200
                flex items-center gap-3 text-left
                ${optionStyle}
                ${showResult ? 'cursor-default' : 'cursor-pointer'}
              `}
            >
              <div className={`
                w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0
                ${isSelected ? 'border-cyan-400' : 'border-slate-500'}
                ${showResult && isCorrectAnswer ? 'border-emerald-400 bg-emerald-400' : ''}
                ${showResult && isSelected && !isCorrectAnswer ? 'border-red-400 bg-red-400' : ''}
              `}>
                {showResult && isCorrectAnswer && (
                  <CheckCircle2 className="w-4 h-4 text-white" />
                )}
                {showResult && isSelected && !isCorrectAnswer && (
                  <XCircle className="w-4 h-4 text-white" />
                )}
                {!showResult && isSelected && (
                  <div className="w-3 h-3 rounded-full bg-cyan-400" />
                )}
              </div>
              <span className={`
                ${showResult && isCorrectAnswer ? 'text-emerald-300 font-medium' : ''}
                ${showResult && isSelected && !isCorrectAnswer ? 'text-red-300' : ''}
                ${!showResult ? 'text-slate-200' : ''}
              `}>
                {option}
              </span>
            </button>
          )
        })}
      </div>

      {/* 解釋（答題後顯示）*/}
      {showResult && question.explanation && (
        <div className={`
          ml-11 p-4 rounded-xl border
          ${isCorrect
            ? 'bg-emerald-500/10 border-emerald-500/30'
            : 'bg-amber-500/10 border-amber-500/30'
          }
        `}>
          <div className="flex items-start gap-2">
            <BookOpen className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isCorrect ? 'text-emerald-400' : 'text-amber-400'}`} />
            <p className={`text-sm ${isCorrect ? 'text-emerald-200' : 'text-amber-200'}`}>
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
      <div className={`
        w-20 h-20 rounded-full flex items-center justify-center
        ${passed
          ? 'bg-gradient-to-br from-emerald-500 to-cyan-500'
          : 'bg-gradient-to-br from-amber-500 to-orange-500'
        }
        shadow-lg ${passed ? 'shadow-emerald-500/30' : 'shadow-amber-500/30'}
      `}>
        {passed ? (
          <Trophy className="w-10 h-10 text-white" />
        ) : (
          <Target className="w-10 h-10 text-white" />
        )}
      </div>

      {/* 結果文字 */}
      <div className="text-center space-y-1">
        <h3 className={`text-xl font-bold ${passed ? 'text-emerald-400' : 'text-amber-400'}`}>
          {passed ? '恭喜通過！🎉' : '再接再厲！💪'}
        </h3>
        <p className="text-slate-400 text-sm">
          {passed
            ? '你已經掌握了這個章節的知識'
            : `需要 ${passingScore}% 才能通過測驗`
          }
        </p>
      </div>

      {/* 分數顯示 - 緊湊版 */}
      <div className="flex items-center gap-6">
        <div className="text-center">
          <div className="text-3xl font-bold text-white">{score}</div>
          <div className="text-xs text-slate-500">正確題數</div>
        </div>
        <div className="text-3xl text-slate-600">/</div>
        <div className="text-center">
          <div className="text-3xl font-bold text-slate-400">{totalQuestions}</div>
          <div className="text-xs text-slate-500">總題數</div>
        </div>
        <div className="pl-4 border-l border-slate-700">
          <div className={`text-3xl font-bold ${passed ? 'text-emerald-400' : 'text-amber-400'}`}>
            {percentage}%
          </div>
          <div className="text-xs text-slate-500">得分率</div>
        </div>
      </div>

      {/* 錯題區域 */}
      {wrongAnswerList.length > 0 && (
        <div className="w-full max-w-2xl">
          {/* 錯題標題 - 可收合 */}
          <button
            onClick={() => setShowWrongAnswers(prev => !prev)}
            className="w-full flex items-center justify-between p-3 rounded-t-xl bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 transition-colors"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <span className="text-red-300 font-medium">
                錯誤題目 ({wrongAnswerList.length} 題)
              </span>
            </div>
            {showWrongAnswers ? (
              <ChevronUp className="w-5 h-5 text-red-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-red-400" />
            )}
          </button>

          {/* 錯題列表 */}
          {showWrongAnswers && (
            <div className="border border-t-0 border-red-500/30 rounded-b-xl bg-slate-800/50 max-h-60 overflow-y-auto">
              {wrongAnswerList.map((wrong, idx) => (
                <div
                  key={wrong.questionId}
                  className={`p-4 ${idx > 0 ? 'border-t border-slate-700' : ''}`}
                >
                  {/* 題目 */}
                  <p className="text-white text-sm font-medium mb-3">
                    <span className="text-slate-500 mr-2">Q{idx + 1}.</span>
                    {wrong.question}
                  </p>

                  {/* 答案對比 */}
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="text-slate-500">你的答案：</span>
                        <span className="text-red-300 ml-1">
                          {wrong.options[wrong.userAnswer] || '未作答'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="text-slate-500">正確答案：</span>
                        <span className="text-emerald-300 ml-1">
                          {wrong.options[wrong.correctAnswer]}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 解釋 */}
                  {wrong.explanation && (
                    <div className="mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <div className="flex items-start gap-2">
                        <BookOpen className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                        <p className="text-amber-200 text-xs leading-relaxed">
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
            className="px-5 py-2.5 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-700 transition-colors flex items-center gap-2 text-sm"
          >
            <RotateCcw className="w-4 h-4" />
            重新測驗
          </button>
        )}
        <button
          onClick={onClose}
          className={`
            px-5 py-2.5 rounded-xl font-semibold transition-all flex items-center gap-2 text-sm
            ${passed
              ? 'bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white shadow-lg shadow-emerald-500/25'
              : 'bg-slate-700 hover:bg-slate-600 text-white'
            }
          `}
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
    <div className="fixed inset-0 z-[9998] flex items-center justify-center">
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 彈窗內容 */}
      <div className="relative w-[90vw] max-w-3xl max-h-[90vh] bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col">
        {/* 標題列 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Target className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-purple-400 font-semibold">課程測驗</span>
              </div>
              <h2 className="text-lg font-bold text-white">{quiz.title}</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* 進度條 */}
        {!showResults && (
          <div className="px-6 py-3 bg-slate-800/30 border-b border-slate-700/50">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-slate-400">
                問題 {currentQuestionIndex + 1} / {totalQuestions}
              </span>
              <span className="text-slate-400">
                已答 {Object.keys(answers).length} 題
              </span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-300"
                style={{ width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }}
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
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-700 bg-slate-800/50">
            <button
              onClick={handlePrev}
              disabled={currentQuestionIndex === 0}
              className={`
                px-4 py-2 rounded-lg flex items-center gap-2 transition-colors
                ${currentQuestionIndex === 0
                  ? 'text-slate-600 cursor-not-allowed'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
                }
              `}
            >
              <ChevronLeft className="w-4 h-4" />
              上一題
            </button>

            <div className="flex gap-2">
              {quiz.questions.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentQuestionIndex(index)}
                  className={`
                    w-8 h-8 rounded-lg text-xs font-medium transition-all
                    ${index === currentQuestionIndex
                      ? 'bg-cyan-500 text-white'
                      : answers[quiz.questions[index].id] !== undefined
                        ? 'bg-slate-600 text-white'
                        : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                    }
                  `}
                >
                  {index + 1}
                </button>
              ))}
            </div>

            {currentQuestionIndex === totalQuestions - 1 ? (
              <button
                onClick={handleSubmit}
                disabled={!allAnswered}
                className={`
                  px-6 py-2 rounded-lg font-semibold flex items-center gap-2 transition-all
                  ${allAnswered
                    ? 'bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white shadow-lg shadow-cyan-500/25'
                    : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  }
                `}
              >
                提交測驗
                <CheckCircle2 className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="px-4 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 flex items-center gap-2 transition-colors"
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
