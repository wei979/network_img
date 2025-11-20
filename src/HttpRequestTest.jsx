import React from 'react'
import HttpRequestDemo from './components/HttpRequestDemo'
import './App.css'

const HttpRequestTest = () => {
  return (
    <div className="min-h-screen bg-slate-900 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-100 mb-4">
            HTTP/HTTPS 請求視覺化測試
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto">
            此頁面展示 HTTP 和 HTTPS 請求的完整流程，包括 TLS 握手（HTTPS）、請求發送、回應接收，
            並根據不同的 HTTP 狀態碼顯示相應的顏色和圖示。
          </p>
        </div>
        
        <HttpRequestDemo />
      </div>
    </div>
  )
}

export default HttpRequestTest