import React from 'react'
import UdpTransferDemo from './components/UdpTransferDemo'
import './App.css'

const UdpTransferTest = () => {
  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-100 mb-4">
          UDP 傳輸協議測試
        </h1>
        <p className="text-slate-400 mb-8">
          此頁面演示 UDP (User Datagram Protocol) 傳輸過程的視覺化。
          UDP 是一種無連接的傳輸協議，特點是快速、簡單，但不保證數據包的可靠傳輸。
        </p>
        
        <UdpTransferDemo />
      </div>
    </div>
  )
}

export default UdpTransferTest