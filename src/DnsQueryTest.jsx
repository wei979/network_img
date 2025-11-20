import React from 'react'
import DnsQueryDemo from './components/DnsQueryDemo'
import './App.css'

const DnsQueryTest = () => {
  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-100 mb-4">
            DNS 查詢視覺化測試
          </h1>
          <p className="text-slate-400 text-lg">
            測試 DNS 查詢過程，包含查詢發送、等待回應和解析結果顯示
          </p>
        </div>
        
        <DnsQueryDemo />
      </div>
    </div>
  )
}

export default DnsQueryTest