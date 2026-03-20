import React from 'react'
import {
  Activity, AlertTriangle, CircleDot, Clock, Loader2,
  RefreshCcw, UploadCloud, Pause, Play, Eye, EyeOff,
  BookOpen, GraduationCap
} from 'lucide-react'
import { S } from '../lib/swiss-tokens'

export default function HeaderToolbar({
  uploading, error, generatedAt, sourceFiles,
  isPaused, isFocusMode, selectedConnectionId,
  showLearningUI, showCourseSidebar, showTutorialOverlay,
  onReload, onTogglePause, onToggleFocus,
  onFollowStream, onToggleCourseSidebar, onToggleTutorial,
  fileInputRef,
}) {
  const btnBase = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    borderRadius: S.radius.sm,
    fontSize: 12, fontWeight: 500,
    fontFamily: S.font.sans,
    cursor: 'pointer',
    transition: 'all 0.15s',
    border: 'none',
  }

  const btnGhost = {
    ...btnBase,
    padding: '6px 12px',
    background: 'transparent',
    color: S.text.secondary,
    border: `1px solid ${S.border}`,
  }

  const btnAccent = {
    ...btnBase,
    padding: '6px 14px',
    background: S.accent,
    color: '#fff',
    fontWeight: 600,
  }

  return (
    <header style={{ padding: '16px 20px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{
              fontSize: 14, fontWeight: 600,
              color: S.text.primary,
              fontFamily: S.font.sans,
              margin: 0, display: 'flex', alignItems: 'center', gap: 8,
            }}>
              {showLearningUI && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '2px 8px', borderRadius: S.radius.sm,
                  background: S.protocol.HTTP + '14',
                  color: S.protocol.HTTP,
                  fontSize: 11, fontWeight: 600,
                  fontFamily: S.font.mono,
                }}>
                  <GraduationCap size={13} />
                  學習模式
                </span>
              )}
              協議時間軸分析
            </h2>
            <p style={{
              fontSize: 11, color: S.text.tertiary,
              marginTop: 4, maxWidth: 600,
              fontFamily: S.font.sans,
            }}>
              {showLearningUI
                ? '跟隨教學引導，一步步學習網路協議分析技能。'
                : '上傳 Wireshark 擷取檔，觀察拓撲圖動畫呈現協定事件。'
              }
            </p>
          </div>

          {showLearningUI && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                type="button" onClick={onToggleCourseSidebar}
                style={{
                  ...btnGhost,
                  ...(showCourseSidebar ? { background: S.protocol.HTTP + '14', color: S.protocol.HTTP, borderColor: S.protocol.HTTP + '33' } : {}),
                }}
              >
                <BookOpen size={14} />
                {showCourseSidebar ? '隱藏目錄' : '顯示目錄'}
              </button>
              <button
                type="button" onClick={onToggleTutorial}
                style={{
                  ...btnGhost,
                  ...(showTutorialOverlay ? { background: S.accent + '14', color: S.accent, borderColor: S.accent + '33' } : {}),
                }}
              >
                {showTutorialOverlay ? <EyeOff size={14} /> : <Eye size={14} />}
                {showTutorialOverlay ? '隱藏引導' : '顯示引導'}
              </button>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{
              ...btnAccent,
              opacity: uploading ? 0.5 : 1,
              cursor: uploading ? 'not-allowed' : 'pointer',
            }}
          >
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />}
            {uploading ? '上傳中...' : '上傳 PCAP'}
          </button>

          <button type="button" onClick={onReload} style={btnGhost}>
            <RefreshCcw size={14} />
            Reload
          </button>

          <button
            type="button" onClick={onTogglePause}
            style={{
              ...btnGhost,
              background: isPaused ? S.protocol.HTTP + '14' : S.accent + '14',
              color: isPaused ? S.protocol.HTTP : S.accent,
              borderColor: isPaused ? S.protocol.HTTP + '33' : S.accent + '33',
            }}
          >
            {isPaused ? <Play size={14} /> : <Pause size={14} />}
            {isPaused ? '播放' : '暫停'}
          </button>

          {selectedConnectionId && (
            <button type="button" onClick={onToggleFocus} style={{
              ...btnGhost,
              background: isFocusMode ? S.accent + '14' : S.protocol.DNS + '14',
              color: isFocusMode ? S.accent : S.protocol.DNS,
              borderColor: isFocusMode ? S.accent + '33' : S.protocol.DNS + '33',
            }}>
              {isFocusMode ? <EyeOff size={14} /> : <Eye size={14} />}
              {isFocusMode ? '退出焦點' : '特定顯示'}
            </button>
          )}

          {selectedConnectionId && selectedConnectionId.startsWith('tcp') && (
            <button type="button" onClick={onFollowStream} style={{
              ...btnGhost,
              background: S.protocol.HTTP + '14',
              color: S.protocol.HTTP,
              borderColor: S.protocol.HTTP + '33',
            }}>
              <Activity size={14} />
              Follow Stream
            </button>
          )}

          {generatedAt && (
            <div style={{ fontSize: 10, color: S.text.faint, display: 'flex', alignItems: 'center', gap: 4, fontFamily: S.font.mono }}>
              <Clock size={12} />
              {new Date(generatedAt).toLocaleString()}
            </div>
          )}

          {sourceFiles.length > 0 && (
            <div style={{ fontSize: 10, color: S.text.tertiary, display: 'flex', alignItems: 'center', gap: 4, fontFamily: S.font.mono }}>
              <CircleDot size={12} style={{ color: S.protocol.HTTP }} />
              {sourceFiles.join(', ')}
            </div>
          )}
        </div>

        {error && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            borderRadius: S.radius.md,
            border: `1px solid ${S.protocol.ICMP}33`,
            background: S.protocol.ICMP + '0c',
            padding: '8px 12px',
            fontSize: 12, color: S.protocol.ICMP,
            fontFamily: S.font.sans,
          }}>
            <AlertTriangle size={14} />
            {error}
          </div>
        )}
      </div>
    </header>
  )
}
