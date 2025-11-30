import React, { useState } from 'react'
import MindMap from './MindMap'
import { Network, BookOpen } from 'lucide-react'
import './App.css'

/**
 * App.jsx - 簡化後的主應用
 *
 * 導航結構：
 * - 主應用：自由分析模式，完整的 MindMap 功能
 * - 學習：進入學習模式，帶有教學引導的 MindMap
 *
 * 設計理念（Scratch 模式）：
 * - 學習不是獨立頁面，而是 MindMap 的一種狀態
 * - 學生操作的就是真實功能
 * - 完成教學 = 熟悉 MindMap 所有功能
 */
function App() {
  const [currentView, setCurrentView] = useState('mindmap')

  return (
    <div className="min-h-screen bg-slate-950">
      {/* 導航欄 - 簡化為兩個按鈕 */}
      <nav className="bg-slate-900 border-b border-slate-800 px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-semibold text-slate-100">網路協議視覺化工具</h1>

          <div className="flex items-center gap-3">
            {/* 主應用按鈕 */}
            <button
              onClick={() => setCurrentView('mindmap')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg transition-all duration-200 ${
                currentView === 'mindmap'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white'
              }`}
            >
              <Network className="w-5 h-5" />
              <span className="font-medium">主應用</span>
            </button>

            {/* 學習按鈕 */}
            <button
              onClick={() => setCurrentView('learning')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg transition-all duration-200 ${
                currentView === 'learning'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white'
              }`}
            >
              <BookOpen className="w-5 h-5" />
              <span className="font-medium">📖 學習</span>
            </button>
          </div>
        </div>
      </nav>

      {/* 主要內容 */}
      <main>
        {/* 主應用模式：自由分析 */}
        {currentView === 'mindmap' && <MindMap />}

        {/* 學習模式：帶教學引導的 MindMap */}
        {currentView === 'learning' && <MindMap isLearningMode={true} />}
      </main>
    </div>
  )
}

export default App
