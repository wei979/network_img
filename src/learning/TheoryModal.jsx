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
      <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
      <p className="text-slate-400">載入動畫組件中...</p>
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
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 彈窗內容 */}
      <div className="relative w-[90vw] max-w-5xl max-h-[90vh] bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col">
        {/* 標題列 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-slate-800/50">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{meta.icon}</span>
            <div>
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-purple-400" />
                <span className="text-xs text-purple-400 font-semibold">理論課</span>
              </div>
              <h2 className="text-xl font-bold text-white">{meta.title}</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* 說明文字 */}
        {(stepTitle || stepContent) && (
          <div className="px-6 py-3 bg-slate-800/30 border-b border-slate-700/50">
            {stepTitle && (
              <h3 className="text-sm font-semibold text-cyan-300 mb-1">{stepTitle}</h3>
            )}
            {stepContent && (
              <p className="text-sm text-slate-300">{stepContent}</p>
            )}
          </div>
        )}

        {/* Demo 組件區域 */}
        <div className="flex-1 overflow-auto p-6">
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
            <Suspense fallback={<LoadingFallback />}>
              <DemoComponent />
            </Suspense>
          </div>

          {/* 說明卡片 */}
          <div className="mt-4 p-4 bg-gradient-to-r from-purple-900/30 to-cyan-900/30 rounded-xl border border-purple-500/30">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Play className="w-5 h-5 text-purple-300" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-purple-300 mb-1">互動提示</h4>
                <p className="text-sm text-slate-400">
                  點擊「播放」按鈕觀看動畫演示。你可以使用進度條和速度控制來調整觀看節奏。
                  觀看完成後，點擊下方按鈕繼續學習。
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 底部操作列 */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-700 bg-slate-800/50">
          <p className="text-sm text-slate-400">{meta.description}</p>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
            >
              稍後再看
            </button>
            <button
              onClick={() => {
                onComplete?.()
                onClose?.()
              }}
              className="px-6 py-2 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white text-sm font-semibold rounded-lg transition-all shadow-lg shadow-cyan-500/25"
            >
              我知道了，繼續 →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
