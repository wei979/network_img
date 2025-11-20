// src/App.jsx
import { useState } from "react";
import LoginForm from "./LoginForm";
import MindMap from './MindMap'
import TcpHandshakeTest from './TcpHandshakeTest'
import TcpTeardownTest from './TcpTeardownTest'
import HttpRequestTest from './HttpRequestTest'
import TimeoutTest from './TimeoutTest'
import DnsQueryTest from './DnsQueryTest'
import UdpTransferTest from './UdpTransferTest'
import ProtocolFilterTest from './ProtocolFilterTest'
import AnomalyDetectionTest from './AnomalyDetectionTest'
import { TestTube, Network, WifiOff, Globe, Clock, Search, Zap, Filter, AlertTriangle } from 'lucide-react'
import './App.css'


export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem("authToken"));
  const [currentView, setCurrentView] = useState('mindmap')

  function handleLoginSuccess(newToken) {
    localStorage.setItem("authToken", newToken);
    setToken(newToken);
  }

  function handleLogout() {
    localStorage.removeItem("authToken");
    setToken(null);
  }

  // 未登入：只顯示登入頁
  if (!token) {
    return <LoginForm onLoginSuccess={handleLoginSuccess} />;
  }

  // 已登入：顯示原本畫面
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      {/* 導航欄 */}
      <nav className="bg-slate-900 border-b border-slate-800 px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-semibold text-slate-100">網路協議視覺化工具</h1>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentView('mindmap')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                currentView === 'mindmap'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              <Network className="w-4 h-4" />
              主應用
            </button>
            
            <button
              onClick={() => setCurrentView('tcp-handshake')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                currentView === 'tcp-handshake'
                  ? 'bg-green-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              <TestTube className="w-4 h-4" />
              TCP 握手測試
            </button>
            
            <button
              onClick={() => setCurrentView('tcp-teardown')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                currentView === 'tcp-teardown'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              <WifiOff className="w-4 h-4" />
              TCP 揮手測試
            </button>
            
            <button
              onClick={() => setCurrentView('http-request')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                currentView === 'http-request'
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              <Globe className="w-4 h-4" />
              HTTP 請求測試
            </button>
            
            <button
              onClick={() => setCurrentView('timeout')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                currentView === 'timeout'
                  ? 'bg-orange-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              <Clock className="w-4 h-4" />
              連線超時測試
            </button>
            
            <button
              onClick={() => setCurrentView('dns-query')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                currentView === 'dns-query'
                  ? 'bg-cyan-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              <Search className="w-4 h-4" />
              DNS 查詢測試
            </button>
            
            <button
              onClick={() => setCurrentView('udp-transfer')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                currentView === 'udp-transfer'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              <Zap className="w-4 h-4" />
              UDP 傳輸測試
            </button>
            
            <button
              onClick={() => setCurrentView('protocol-filter')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                currentView === 'protocol-filter'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              <Filter className="w-4 h-4" />
              協議過濾器測試
            </button>
            
            <button
              onClick={() => setCurrentView('anomaly-detection')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                currentView === 'anomaly-detection'
                  ? 'bg-red-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              異常檢測測試
            </button>
            <button
              onClick={handleLogout}
              className="text-sm px-3 py-1 rounded border border-slate-600 hover:bg-slate-800"
            >
              登出
            </button>
          </div>
        </div>
      </nav>

      {/* 主要內容 */}
      <main>
        {currentView === 'mindmap' && <MindMap />}
        {currentView === 'tcp-handshake' && <TcpHandshakeTest />}
        {currentView === 'tcp-teardown' && <TcpTeardownTest />}
        {currentView === 'http-request' && <HttpRequestTest />}
        {currentView === 'timeout' && <TimeoutTest />}
        {currentView === 'dns-query' && <DnsQueryTest />}
        {currentView === 'udp-transfer' && <UdpTransferTest />}
        {currentView === 'protocol-filter' && <ProtocolFilterTest />}
        {currentView === 'anomaly-detection' && <AnomalyDetectionTest />}
      </main>
    </div>
  );
}
