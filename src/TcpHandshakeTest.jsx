import React from 'react'
import TcpHandshakeDemo from './components/TcpHandshakeDemo'
import './App.css'

function TcpHandshakeTest() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8 text-slate-100">
          TCP 三次握手視覺化測試
        </h1>
        
        <TcpHandshakeDemo />
        
        <div className="mt-8 text-center text-sm text-slate-400">
          <p>這個演示展示了 TCP 三次握手的詳細動畫過程</p>
          <p>包含 SYN → SYN-ACK → ACK 的完整流程</p>
        </div>
      </div>
    </div>
  )
}

export default TcpHandshakeTest