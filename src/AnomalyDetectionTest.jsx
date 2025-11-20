import React, { useState } from 'react'
import AnomalyDetection from './components/AnomalyDetection'
import { AlertTriangle, TrendingUp, Shield, Eye } from 'lucide-react'

function AnomalyDetectionTest() {
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [anomalyCount, setAnomalyCount] = useState(0)

  // 模擬啟動/停止監控
  const toggleMonitoring = () => {
    setIsMonitoring(!isMonitoring)
    if (!isMonitoring) {
      setAnomalyCount(Math.floor(Math.random() * 5) + 1) // 模擬一些初始異常
    } else {
      setAnomalyCount(0)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8 text-slate-100">
          網路異常檢測系統
        </h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* 系統資訊面板 */}
          <div className="lg:col-span-1 bg-slate-900 rounded-xl border border-slate-800 p-6">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">系統狀態</h3>
            <div className="space-y-3 text-slate-300">
              <div className="flex justify-between items-center">
                <span>監控狀態:</span>
                <span className={`font-semibold ${isMonitoring ? 'text-green-400' : 'text-red-400'}`}>
                  {isMonitoring ? '運行中' : '已停止'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>當前異常數:</span>
                <span className="font-semibold text-yellow-400">{anomalyCount}</span>
              </div>
              <div className="flex justify-between">
                <span>上次檢測:</span>
                <span className="font-semibold text-slate-300">2023-10-26 14:30:00</span>
              </div>
            </div>
            <button
              onClick={toggleMonitoring}
              className={`mt-6 w-full px-4 py-2 rounded-lg font-medium transition-colors ${
                isMonitoring
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-green-600 hover:bg-green-700'
              } text-white`}
            >
              {isMonitoring ? '停止監控' : '開始監控'}
            </button>
          </div>

          {/* 威脅統計 */}
          <div className="lg:col-span-2 bg-slate-900 rounded-xl border border-slate-800 p-6">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">威脅統計</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 text-center">
                <Shield className="w-8 h-8 text-red-400 mx-auto mb-2" />
                <p className="font-semibold text-slate-200">SYN Flood</p>
                <p className="text-sm text-slate-400">上次: 2023-10-26 14:28</p>
              </div>
              <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 text-center">
                <Eye className="w-8 h-8 text-orange-400 mx-auto mb-2" />
                <p className="font-semibold text-slate-200">埠口掃描</p>
                <p className="text-sm text-slate-400">上次: 2023-10-26 13:55</p>
              </div>
              <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 text-center">
                <TrendingUp className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                <p className="font-semibold text-slate-200">DNS 隧道</p>
                <p className="text-sm text-slate-400">上次: 2023-10-26 12:10</p>
              </div>
            </div>
            <div className="mt-4 text-sm text-slate-400 space-y-2">
              <p>
                監控短時間內來自同一源地址的大量 SYN 包，當超過設定閾值時觸發告警。
                這種攻擊會消耗伺服器連接資源，導致正常用戶無法建立連接。
              </p>
              <p>
                分析 DNS 查詢的頻率、大小和模式，檢測可能的數據洩露或命令控制通訊。
                異常的 DNS 查詢模式可能表明惡意軟體正在使用 DNS 協議傳輸數據。
              </p>
              <p>
                埠掃描通常是攻擊的前期準備，用於發現可利用的服務。
              </p>
            </div>
          </div>
        </div>

        {/* 實際的 AnomalyDetection 組件 */}
        <AnomalyDetection />
      </div>
    </div>
  )
}

export default AnomalyDetectionTest