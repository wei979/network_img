import React, { useState, useEffect } from 'react'
import { AlertTriangle, Shield, Eye, Activity, Clock, Loader2 } from 'lucide-react'

const AnomalyDetection = () => {
  const [attackData, setAttackData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [detectionRules, setDetectionRules] = useState({
    synFlood: { enabled: true, threshold: 100, timeWindow: 60 },
    dnsTunnel: { enabled: true, threshold: 50, timeWindow: 300 },
    portScan: { enabled: true, threshold: 20, timeWindow: 30 }
  })

  useEffect(() => {
    let cancelled = false
    const fetchAttacks = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/attacks')
        if (!res.ok) {
          if (res.status === 404) {
            if (!cancelled) setAttackData(null)
            return
          }
          throw new Error(`HTTP ${res.status}`)
        }
        const data = await res.json()
        if (!cancelled) setAttackData(data)
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchAttacks()
    return () => { cancelled = true }
  }, [])

  const handleRuleChange = (ruleType, field, value) => {
    setDetectionRules(prev => ({
      ...prev,
      [ruleType]: { ...prev[ruleType], [field]: value }
    }))
  }

  const getSeverityColor = (severity) => {
    const colors = {
      high: 'text-red-600 bg-red-50 border-red-200',
      critical: 'text-red-600 bg-red-50 border-red-200',
      medium: 'text-yellow-600 bg-yellow-50 border-yellow-200',
      low: 'text-blue-600 bg-blue-50 border-blue-200',
      normal: 'text-green-600 bg-green-50 border-green-200',
    }
    return colors[severity] || colors.low
  }

  const getSeverityLabel = (severity) => {
    const labels = { high: '高', critical: '極高', medium: '中', low: '低', normal: '正常' }
    return labels[severity] || severity
  }

  const ruleConfigs = [
    { key: 'synFlood', name: 'SYN Flood 偵測', icon: Shield, color: 'text-red-500', description: '偵測短時間內大量 SYN 封包的異常行為' },
    { key: 'dnsTunnel', name: 'DNS 隧道偵測', icon: Activity, color: 'text-blue-500', description: '偵測可疑的 DNS 查詢模式和資料傳輸' },
    { key: 'portScan', name: '連接埠掃描偵測', icon: Eye, color: 'text-orange-500', description: '偵測針對多個連接埠的掃描行為' },
  ]

  // 從 API 資料構建偵測結果
  const detectedAnomalies = []
  if (attackData?.attack_detection?.detected) {
    const det = attackData.attack_detection
    const metrics = attackData.metrics || {}
    const topSrc = attackData.top_sources?.[0]
    const topTgt = attackData.top_targets?.[0]

    detectedAnomalies.push({
      id: 'primary',
      type: det.type || 'Unknown',
      severity: det.severity || 'medium',
      source: topSrc?.ip ?? '未知',
      target: topTgt?.port ? `Port ${topTgt.port}` : '多目標',
      count: metrics.total_tcp_packets || 0,
      description: det.description || '偵測到異常流量',
      confidence: det.confidence ?? 0,
      anomalyScore: det.anomaly_score ?? 0,
    })
  }

  return (
    <div className="space-y-6">
      {/* 偵測規則配置 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-800">異常偵測規則</h3>
          <span className="text-xs text-gray-400">參考用（尚未連接後端）</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {ruleConfigs.map((config) => {
            const Icon = config.icon
            const rule = detectionRules[config.key]
            return (
              <div key={config.key} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-gray-100 rounded-full">
                    <Icon size={20} className={config.color} />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-800">{config.name}</h4>
                    <p className="text-sm text-gray-600">{config.description}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">啟用偵測</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rule.enabled}
                        onChange={(e) => handleRuleChange(config.key, 'enabled', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      閾值: {rule.threshold}
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="500"
                      value={rule.threshold}
                      onChange={(e) => handleRuleChange(config.key, 'threshold', parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      disabled={!rule.enabled}
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      時間範圍: {rule.timeWindow}s
                    </label>
                    <input
                      type="range"
                      min="30"
                      max="600"
                      value={rule.timeWindow}
                      onChange={(e) => handleRuleChange(config.key, 'timeWindow', parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      disabled={!rule.enabled}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 偵測結果 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800">偵測結果</h3>
            <span className="text-sm text-gray-500">
              {loading ? '載入中...' : `共 ${detectedAnomalies.length} 條紀錄`}
            </span>
          </div>
        </div>

        {/* 整體攻擊指標摘要 */}
        {attackData && !loading && (
          <div className="p-4 bg-gray-50 border-b border-gray-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-500">TCP 封包總數</span>
                <p className="font-mono font-medium text-gray-800">{attackData.metrics?.total_tcp_packets?.toLocaleString() ?? '—'}</p>
              </div>
              <div>
                <span className="text-gray-500">異常評分</span>
                <p className="font-medium" style={{ color: (attackData.attack_detection?.anomaly_score ?? 0) > 50 ? '#ef4444' : '#22c55e' }}>
                  {attackData.attack_detection?.anomaly_score ?? 0}/100
                </p>
              </div>
              <div>
                <span className="text-gray-500">信心度</span>
                <p className="font-medium text-gray-800">{((attackData.attack_detection?.confidence ?? 0) * 100).toFixed(0)}%</p>
              </div>
              <div>
                <span className="text-gray-500">連線速率</span>
                <p className="font-mono font-medium text-gray-800">{attackData.metrics?.connections_per_second ?? '—'}/s</p>
              </div>
            </div>
          </div>
        )}

        <div className="divide-y divide-gray-100">
          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-8 h-8 mx-auto text-gray-400 animate-spin" />
              <p className="text-gray-500 mt-2">正在載入偵測資料...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <AlertTriangle className="w-12 h-12 mx-auto text-yellow-400" />
              <p className="text-gray-500 mt-2">無法取得偵測資料</p>
              <p className="text-sm text-gray-400 mt-1">請確認後端已啟動並已上傳 PCAP 檔案</p>
            </div>
          ) : detectedAnomalies.length > 0 ? (
            detectedAnomalies.map((anomaly) => (
              <div key={anomaly.id} className="p-6 hover:bg-gray-50 transition-colors duration-150">
                <div className="flex items-start space-x-4">
                  <div className={`p-2 rounded-full border ${getSeverityColor(anomaly.severity)}`}>
                    <Shield size={20} />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <h4 className="font-medium text-gray-800">{anomaly.type}</h4>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getSeverityColor(anomaly.severity)}`}>
                          {getSeverityLabel(anomaly.severity)}
                        </span>
                      </div>
                    </div>

                    <p className="text-gray-600 mb-3">{anomaly.description}</p>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">來源:</span>
                        <span className="ml-2 font-mono text-gray-800">{anomaly.source}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">目標:</span>
                        <span className="ml-2 font-mono text-gray-800">{anomaly.target}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">封包數:</span>
                        <span className="ml-2 font-medium text-gray-800">{anomaly.count.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">信心度:</span>
                        <span className="ml-2 font-medium text-gray-800">{(anomaly.confidence * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center">
              <div className="text-gray-400 mb-2">
                <Shield className="w-12 h-12 mx-auto text-green-400" />
              </div>
              <p className="text-gray-600 font-medium">未偵測到攻擊行為</p>
              <p className="text-sm text-gray-400 mt-1">
                {attackData ? '目前流量分析結果正常' : '請先上傳 PCAP 檔案進行分析'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AnomalyDetection
