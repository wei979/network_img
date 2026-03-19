import React from 'react'
import {
  Activity, AlertTriangle, CircleDot, Clock, Loader2,
  RefreshCcw, UploadCloud, Pause, Play, Eye, EyeOff,
  BookOpen, GraduationCap
} from 'lucide-react'

export default function HeaderToolbar({
  uploading, error, generatedAt, sourceFiles,
  isPaused, isFocusMode, selectedConnectionId,
  showLearningUI, showCourseSidebar, showTutorialOverlay,
  onReload, onTogglePause, onToggleFocus,
  onFollowStream, onToggleCourseSidebar, onToggleTutorial,
  fileInputRef,
}) {
  return (
    <header className="mindmap-header px-6 pt-6">
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              {showLearningUI && (
                <span className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-600/30 text-emerald-300 rounded-lg text-sm">
                  <GraduationCap className="w-4 h-4" />
                  學習模式
                </span>
              )}
              協議時間軸分析
            </h2>
            <p className="text-sm text-slate-400 mt-2 max-w-2xl">
              {showLearningUI
                ? '跟隨教學引導，一步步學習網路協議分析技能。'
                : '上傳 Wireshark 擷取檔，觀察心智圖沿著時間軸動畫呈現 TCP 交握、UDP 傳輸與其他協定事件。'
              }
            </p>
          </div>

          {showLearningUI && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onToggleCourseSidebar}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                  showCourseSidebar
                    ? 'bg-emerald-600/30 text-emerald-300'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                {showCourseSidebar ? '隱藏目錄' : '顯示目錄'}
              </button>
              <button
                type="button"
                onClick={onToggleTutorial}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                  showTutorialOverlay
                    ? 'bg-cyan-600/30 text-cyan-300'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {showTutorialOverlay ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {showTutorialOverlay ? '隱藏引導' : '顯示引導'}
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="upload-button btn-primary inline-flex items-center gap-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
            {uploading ? '正在上傳...' : '上傳 PCAP／PCAPNG'}
          </button>

          <button type="button" onClick={onReload} className="btn-ghost inline-flex items-center gap-2 text-sm hover-lift">
            <RefreshCcw className="w-4 h-4" />
            Reload
          </button>

          <button
            type="button"
            onClick={onTogglePause}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-300 hover-lift ${
              isPaused
                ? 'bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-lg shadow-emerald-500/25'
                : 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg shadow-amber-500/25'
            }`}
          >
            {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            {isPaused ? '播放' : '暫停'}
          </button>

          {selectedConnectionId && (
            <button
              type="button"
              onClick={onToggleFocus}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-300 hover-lift ${
                isFocusMode
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/25'
                  : 'bg-gradient-to-r from-purple-600 to-violet-600 text-white shadow-lg shadow-purple-500/25'
              }`}
            >
              {isFocusMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {isFocusMode ? '退出焦點' : '特定顯示'}
            </button>
          )}

          {selectedConnectionId && selectedConnectionId.startsWith('tcp') && (
            <button
              type="button"
              onClick={onFollowStream}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/25 transition-all duration-300 hover-lift"
            >
              <Activity className="w-4 h-4" />
              Follow Stream
            </button>
          )}

          {generatedAt && (
            <div className="text-xs text-slate-500 flex items-center gap-1">
              <Clock className="w-4 h-4 text-slate-500" />
              Generated {new Date(generatedAt).toLocaleString()}
            </div>
          )}

          {sourceFiles.length > 0 && (
            <div className="text-xs text-slate-500 flex items-center gap-1">
              <CircleDot className="w-4 h-4 text-emerald-400" />
              {sourceFiles.join('、')}
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-3 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            <AlertTriangle className="w-4 h-4" />
            {error}
          </div>
        )}
      </div>
    </header>
  )
}
