import React from 'react'
import AnomalyDetection from './components/AnomalyDetection'
import './App.css'

const AnomalyDetectionTest = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">網路異常偵測系統</h1>
          <p className="text-gray-600">
            即時監控網路流量，偵測 SYN Flood、DNS 隧道、連接埠掃描等異常行為
          </p>
        </div>

        <AnomalyDetection />

        {/* 系統資訊面板 */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-full">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-800">系統狀態</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">監控狀態:</span>
                <span className="text-green-600 font-medium">正常</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">偵測引擎:</span>
                <span className="text-green-600 font-medium">執行中</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">規則版本:</span>
                <span className="text-gray-800 font-medium">v2.1.0</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-green-100 rounded-full">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-800">效能指標</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">處理速度:</span>
                <span className="text-gray-800 font-medium">1.2K pps</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">記憶體使用:</span>
                <span className="text-gray-800 font-medium">45.2 MB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">CPU 使用:</span>
                <span className="text-gray-800 font-medium">12.5%</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-orange-100 rounded-full">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-800">威脅統計</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">今日偵測:</span>
                <span className="text-red-600 font-medium">23 次</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">已阻止:</span>
                <span className="text-green-600 font-medium">18 次</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">誤報率:</span>
                <span className="text-gray-800 font-medium">2.1%</span>
              </div>
            </div>
          </div>
        </div>

        {/* 检测规则说明 */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          偵測規則說明
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <h4 className="font-medium text-red-600">SYN Flood 偵測</h4>
              <p className="text-sm text-gray-600">
                監控短時間內來自同一來源位址的大量 SYN 封包，當超過設定閾值時觸發警示。
                這種攻擊會消耗伺服器連線資源，導致正常使用者無法建立連線。
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-blue-600">DNS 隧道偵測</h4>
              <p className="text-sm text-gray-600">
                分析 DNS 查詢的頻率、大小和模式，偵測可能的資料外洩或命令控制通訊。
                異常的 DNS 查詢模式可能表示惡意軟體正在使用 DNS 協定傳輸資料。
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-orange-600">連接埠掃描偵測</h4>
              <p className="text-sm text-gray-600">
                監控來自單一來源位址對多個目標連接埠的連線嘗試，識別網路偵察行為。
                連接埠掃描通常是攻擊的前期準備，用於發現可利用的服務。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AnomalyDetectionTest