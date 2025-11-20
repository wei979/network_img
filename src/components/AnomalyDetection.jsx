import React, { useState, useEffect } from 'react'
import { AlertTriangle, Shield, Eye, Activity, TrendingUp, Clock, PlayCircle, StopCircle, CheckCircle } from 'lucide-react'

const AnomalyDetection = () => {
  const [detectionRules, setDetectionRules] = useState({
    synFlood: { enabled: true, threshold: 100, timeWindow: 60 },
    dnsTunnel: { enabled: true, threshold: 50, timeWindow: 300 },
    portScan: { enabled: true, threshold: 20, timeWindow: 30 }
  })

  const [detectedAnomalies, setDetectedAnomalies] = useState([])
  const [isMonitoring, setIsMonitoring] = useState(false)

  const mockAnomalies = [
    { id: 1, type: 'synFlood', severity: 'high', source: '192.168.1.100', target: '192.168.1.1', count: 150, description: '偵測到 SYN Flood 攻擊，短時間內發送大量 SYN 包' },
    { id: 2, type: 'portScan', severity: 'medium', source: '10.0.0.50', target: '192.168.1.0/24', count: 25, description: '偵測到端口掃描行為，嘗試探測多個端口' },
    { id: 3, type: 'dnsTunnel', severity: 'low', source: '192.168.1.200', target: 'suspicious.domain.com', count: 75, description: '偵測到可疑 DNS 查詢模式，可能存在 DNS 隧道' }
  ]

  useEffect(() => {
    if (isMonitoring) {
      const interval = setInterval(() => {
        const randomAnomaly = mockAnomalies[Math.floor(Math.random() * mockAnomalies.length)]
        const newAnomaly = { ...randomAnomaly, id: Date.now(), timestamp: new Date(), count: Math.floor(Math.random() * 200) + 50 }
        setDetectedAnomalies(prev => [newAnomaly, ...prev.slice(0, 19)])
      }, 3000)
      return () => clearInterval(interval)
    }
  }, [isMonitoring])

  const handleRuleChange = (ruleType, field, value) => {
    setDetectionRules(prev => ({ ...prev, [ruleType]: { ...prev[ruleType], [field]: value } }))
  }

  const getSeverityClasses = (severity) => {
    const classes = {
      high: { text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' },
      medium: { text: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' },
      low: { text: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' }
    }
    return classes[severity] || classes.low
  }

  const getTypeUI = (type) => {
    const types = {
      synFlood: { name: 'SYN Flood', icon: Shield, color: 'red' },
      portScan: { name: '端口掃描', icon: Eye, color: 'orange' },
      dnsTunnel: { name: 'DNS 隧道', icon: Activity, color: 'blue' }
    }
    return types[type] || { name: type, icon: AlertTriangle, color: 'gray' }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
           <h2 className="text-xl font-bold text-slate-100 flex items-center gap-3">
             <AlertTriangle className="w-6 h-6 text-yellow-400"/>
             <span>異常檢測儀表板</span>
           </h2>
           <p className="text-sm text-slate-400 mt-2 max-w-2xl">
             配置檢測規則並即時監控網路流量中的異常行為。
           </p>
        </div>
        <button onClick={() => setIsMonitoring(!isMonitoring)} className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold transition-all duration-200 text-white ${isMonitoring ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}>
          {isMonitoring ? <StopCircle size={18} /> : <PlayCircle size={18} />}
          <span>{isMonitoring ? '停止監控' : '開始監控'}</span>
        </button>
      </div>

      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
        <h3 className="text-lg font-semibold text-slate-100 mb-4">檢測規則設定</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.entries(detectionRules).map(([key, rule]) => {
            const config = getTypeUI(key)
            const Icon = config.icon
            return (
              <div key={key} className={`rounded-lg p-4 border-2 transition-opacity ${rule.enabled ? `border-${config.color}-500/50 bg-${config.color}-500/5` : 'border-slate-700/80 bg-slate-800/40 opacity-70'}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Icon size={20} className={`text-${config.color}-400`} />
                    <h4 className="font-semibold text-slate-200">{config.name}</h4>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={rule.enabled} onChange={(e) => handleRuleChange(key, 'enabled', e.target.checked)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:border-gray-300 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                  </label>
                </div>
                <div className={`space-y-3 transition-opacity ${!rule.enabled && 'opacity-50'}`}>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">閾值: <span className="font-mono text-white">{rule.threshold}</span></label>
                    <input type="range" min="10" max="500" value={rule.threshold} onChange={(e) => handleRuleChange(key, 'threshold', parseInt(e.target.value))} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500" disabled={!rule.enabled} />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">時間窗口: <span className="font-mono text-white">{rule.timeWindow}s</span></label>
                    <input type="range" min="30" max="600" value={rule.timeWindow} onChange={(e) => handleRuleChange(key, 'timeWindow', parseInt(e.target.value))} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500" disabled={!rule.enabled} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
      
      <div className="bg-slate-900 rounded-xl border border-slate-800">
        <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-100">偵測到的異常日誌</h3>
            <div className={`flex items-center gap-2 text-sm ${isMonitoring ? 'text-green-400' : 'text-slate-500'}`}>
              {isMonitoring && <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>}
              <span>{isMonitoring ? '即時監控中' : '監控已停止'}</span>
            </div>
        </div>
        <div className="divide-y divide-slate-800">
          {detectedAnomalies.length > 0 ? (
            detectedAnomalies.map((anomaly) => {
              const ui = getTypeUI(anomaly.type)
              const severity = getSeverityClasses(anomaly.severity)
              return (
                <div key={anomaly.id} className={`p-4 sm:p-6 transition-colors duration-150 ${severity.bg} hover:bg-slate-800/60`}>
                  <div className="flex flex-col sm:flex-row items-start gap-4">
                    <div className={`p-2 rounded-full border-2 ${severity.border} ${severity.bg}`}>
                      <ui.icon size={20} className={severity.text} />
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <h4 className="font-semibold text-slate-100">{ui.name}</h4>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${severity.border} ${severity.text} ${severity.bg}`}>{anomaly.severity.toUpperCase()}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-400 mt-2 sm:mt-0">
                          <Clock size={14} /><span>{anomaly.timestamp.toLocaleTimeString()}</span>
                        </div>
                      </div>
                      <p className="text-slate-300 mb-3 text-sm">{anomaly.description}</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs bg-slate-800/50 p-3 rounded-md border border-slate-700/50">
                        <div><span className="text-slate-500">來源:</span><span className="ml-2 font-mono text-slate-300">{anomaly.source}</span></div>
                        <div><span className="text-slate-500">目標:</span><span className="ml-2 font-mono text-slate-300">{anomaly.target}</span></div>
                        <div><span className="text-slate-500">計數:</span><span className="ml-2 font-medium text-slate-200">{anomaly.count}</span></div>
                        <div><span className="text-slate-500">嚴重性:</span><span className={`ml-2 font-medium ${severity.text}`}>{anomaly.severity === 'high' ? '高' : anomaly.severity === 'medium' ? '中' : '低'}</span></div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="p-12 text-center">
              <div className="text-slate-600 mb-3"><AlertTriangle className="w-12 h-12 mx-auto" /></div>
              <p className="text-slate-400 font-semibold">暫無偵測到異常</p>
              <p className="text-sm text-slate-500 mt-1">{isMonitoring ? '正在即時監控中...' : '點擊 "開始監控" 以開始偵測'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AnomalyDetection