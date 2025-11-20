import React from 'react'
import TcpTeardownDemo from './components/TcpTeardownDemo'
import './App.css'

const TcpTeardownTest = () => {
  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-100 mb-2">TCP 四次揮手測試</h1>
        <p className="text-slate-400 mb-8">
          測試 TCP 連線終止過程的視覺化動畫，展示 FIN → ACK → FIN → ACK 的完整流程
        </p>
        
        <TcpTeardownDemo />
      </div>
    </div>
  )
}

export default TcpTeardownTest