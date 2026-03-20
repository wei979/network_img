/**
 * TheoryModal.jsx - 理論說明彈窗
 *
 * 在學習模式下顯示理論課內容，嵌入 Demo 組件
 * 支援的 Demo 組件：
 * - TcpHandshakeDemo: TCP 三次握手
 * - TcpTeardownDemo: TCP 四次揮手
 * - DnsQueryDemo: DNS 查詢
 * - HttpRequestDemo: HTTP 請求
 * - UdpTransferDemo: UDP 傳輸
 * - TimeoutDemo: 連線超時
 */

import React, { lazy, Suspense } from 'react'
import { X, BookOpen, Play, Loader2 } from 'lucide-react'
import { S } from '../lib/swiss-tokens'

// 動態載入 Demo 組件
const demoComponents = {
  TcpHandshakeDemo: lazy(() => import('../components/TcpHandshakeDemo')),
  TcpTeardownDemo: lazy(() => import('../components/TcpTeardownDemo')),
  DnsQueryDemo: lazy(() => import('../components/DnsQueryDemo')),
  HttpRequestDemo: lazy(() => import('../components/HttpRequestDemo')),
  UdpTransferDemo: lazy(() => import('../components/UdpTransferDemo')),
  TimeoutDemo: lazy(() => import('../components/TimeoutDemo'))
}

// Demo 組件的中文標題和描述
const demoMeta = {
  TcpHandshakeDemo: {
    title: 'TCP 三次握手',
    description: '了解 TCP 連線建立的過程：SYN → SYN-ACK → ACK',
    icon: '🤝'
  },
  TcpTeardownDemo: {
    title: 'TCP 四次揮手',
    description: '了解 TCP 連線關閉的過程：FIN → ACK → FIN → ACK',
    icon: '👋'
  },
  DnsQueryDemo: {
    title: 'DNS 查詢',
    description: '了解域名解析的過程：Query → Response',
    icon: '🔍'
  },
  HttpRequestDemo: {
    title: 'HTTP 請求',
    description: '了解 HTTP 請求響應的過程：Request → Response',
    icon: '🌐'
  },
  UdpTransferDemo: {
    title: 'UDP 傳輸',
    description: '了解 UDP 無連線傳輸的特性',
    icon: '📦'
  },
  TimeoutDemo: {
    title: '連線超時',
    description: '了解網路超時的原因和表現',
    icon: '⏱️'
  }
}

/**
 * 載入中的佔位組件
 */
function LoadingFallback() {
  return (
    <div className="flex flex-col items-center justify-center h-96 gap-4">
      <Loader2 className="w-12 h-12 animate-spin" style={{ color: S.accent }} />
      <p style={{ color: S.text.secondary }}>載入動畫組件中...</p>
    </div>
  )
}

/**
 * TheoryModal 理論課彈窗組件
 */
export default function TheoryModal({
  componentName,    // Demo 組件名稱
  stepTitle,        // 步驟標題
  stepContent,      // 步驟說明
  onClose,          // 關閉回調
  onComplete,       // 完成回調（點擊「我知道了」）
  isVisible = false
}) {
  if (!isVisible || !componentName) return null

  const DemoComponent = demoComponents[componentName]
  const meta = demoMeta[componentName] || {
    title: componentName,
    description: '',
    icon: '📖'
  }

  if (!DemoComponent) {
    console.warn(`未知的 Demo 組件: ${componentName}`)
    return null
  }

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center">
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-black/80"
        onClick={onClose}
      />

      {/* 彈窗內容 */}
      <div
        className="relative w-[90vw] max-w-5xl max-h-[90vh] overflow-hidden flex flex-col"
        style={{
          background: S.bgRaised,
          borderRadius: S.radius.lg,
          border: `1px solid ${S.border}`,
        }}
      >
        {/* 標題列 */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{
            borderBottom: `1px solid ${S.border}`,
            background: S.surface,
          }}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">{meta.icon}</span>
            <div>
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" style={{ color: S.protocol.DNS }} />
                <span className="text-xs font-semibold" style={{ color: S.protocol.DNS }}>理論課</span>
              </div>
              <h2 className="text-xl font-bold" style={{ color: S.text.primary }}>{meta.title}</h2>
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

        {/* 說明文字 */}
        {(stepTitle || stepContent) && (
          <div
            className="px-6 py-3"
            style={{
              background: `${S.surface}80`,
              borderBottom: `1px solid ${S.border}80`,
            }}
          >
            {stepTitle && (
              <h3 className="text-sm font-semibold mb-1" style={{ color: S.accent }}>{stepTitle}</h3>
            )}
            {stepContent && (
              <p className="text-sm" style={{ color: S.text.secondary }}>{stepContent}</p>
            )}
          </div>
        )}

        {/* Demo 組件區域 */}
        <div className="flex-1 overflow-auto p-6">
          <div
            className="p-4"
            style={{
              background: S.surface,
              borderRadius: S.radius.md,
              border: `1px solid ${S.border}`,
            }}
          >
            <Suspense fallback={<LoadingFallback />}>
              <DemoComponent />
            </Suspense>
          </div>

          {/* 說明卡片 */}
          <div
            className="mt-4 p-4"
            style={{
              borderRadius: S.radius.md,
              background: `${S.protocol.DNS}0c`,
              border: `1px solid ${S.protocol.DNS}30`,
            }}
          >
            <div className="flex items-start gap-3">
              <div className="p-2" style={{ background: `${S.protocol.DNS}20`, borderRadius: S.radius.sm }}>
                <Play className="w-5 h-5" style={{ color: S.protocol.DNS }} />
              </div>
              <div>
                <h4 className="text-sm font-semibold mb-1" style={{ color: S.protocol.DNS }}>互動提示</h4>
                <p className="text-sm" style={{ color: S.text.secondary }}>
                  點擊「播放」按鈕觀看動畫演示。你可以使用進度條和速度控制來調整觀看節奏。
                  觀看完成後，點擊下方按鈕繼續學習。
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 底部操作列 */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{
            borderTop: `1px solid ${S.border}`,
            background: S.surface,
          }}
        >
          <p className="text-sm" style={{ color: S.text.secondary }}>{meta.description}</p>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm transition-colors"
              style={{ color: S.text.tertiary }}
            >
              稍後再看
            </button>
            <button
              onClick={() => {
                onComplete?.()
                onClose?.()
              }}
              className="px-6 py-2 text-sm font-semibold transition-all"
              style={{
                borderRadius: S.radius.md,
                background: S.accent,
                color: '#fff',
              }}
            >
              我知道了，繼續 →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
