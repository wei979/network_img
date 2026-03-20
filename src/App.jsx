import React, { useState } from 'react'
import MindMap from './MindMap'
import { Network, BookOpen } from 'lucide-react'
import { S } from './lib/swiss-tokens'

/**
 * App.jsx — Swiss Editorial Dark shell
 *
 * 導航結構：
 * - 主應用：自由分析模式，完整的 MindMap 功能
 * - 學習：進入學習模式，帶有教學引導的 MindMap
 */
const navItems = [
  { key: 'mindmap',  label: '拓撲圖', icon: Network },
  { key: 'learning', label: '教學',   icon: BookOpen },
]

function App() {
  const [currentView, setCurrentView] = useState('mindmap')

  return (
    <div style={{ minHeight: '100vh', background: S.bg }}>
      {/* ── Header (52px, Swiss Editorial) ── */}
      <header style={{
        height: 52,
        padding: '0 20px',
        display: 'flex',
        alignItems: 'center',
        background: S.bgRaised,
        borderBottom: `1px solid ${S.border}`,
        flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 28 }}>
          <div style={{
            width: 28, height: 28,
            borderRadius: S.radius.sm,
            background: S.accent,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff',
            fontSize: 16, fontWeight: 700,
            fontFamily: S.font.serif,
          }}>
            W
          </div>
          <span style={{
            fontSize: 20,
            fontFamily: S.font.serif,
            fontWeight: 700,
            color: S.text.primary,
            letterSpacing: '-0.03em',
          }}>
            WireMap
          </span>
        </div>

        {/* Nav tabs (underline style) */}
        <nav style={{ display: 'flex', gap: 0, height: '100%' }}>
          {navItems.map(({ key, label, icon: Icon }) => {
            const isActive = currentView === key
            return (
              <button
                key={key}
                onClick={() => setCurrentView(key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '0 16px',
                  height: '100%',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: `2px solid ${isActive ? S.accent : 'transparent'}`,
                  color: isActive ? S.text.primary : S.text.tertiary,
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 400,
                  fontFamily: S.font.sans,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                <Icon size={16} />
                {label}
              </button>
            )
          })}
        </nav>
      </header>

      {/* ── Main content ── */}
      <main>
        {currentView === 'mindmap' && <MindMap />}
        {currentView === 'learning' && <MindMap isLearningMode={true} />}
      </main>
    </div>
  )
}

export default App
