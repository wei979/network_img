import React, { useState, useEffect } from 'react'
import { AlertTriangle, Shield, Eye, Activity, TrendingUp, Clock } from 'lucide-react'

const AnomalyDetection = () => {
  const [detectionRules, setDetectionRules] = useState({
    synFlood: { enabled: true, threshold: 100, timeWindow: 60 },
    dnsTunnel: { enabled: true, threshold: 50, timeWindow: 300 },
    portScan: { enabled: true, threshold: 20, timeWindow: 30 }
  })

  const [detectedAnomalies, setDetectedAnomalies] = useState([])
  const [isMonitoring, setIsMonitoring] = useState(false)

  // 模拟异常检测数据
  const mockAnomalies = [
    {
      id: 1,
      type: 'synFlood',
      severity: 'high',
      source: '192.168.1.100',
      target: '192.168.1.1',
      count: 150,
      timestamp: new Date(Date.now() - 300000),
      description: '检测到 SYN Flood 攻击，短时间内发送大量 SYN 包'
    },
    {
      id: 2,
      type: 'portScan',
      severity: 'medium',
      source: '10.0.0.50',
      target: '192.168.1.0/24',
      count: 25,
      timestamp: new Date(Date.now() - 600000),
      description: '检测到端口扫描行为，尝试探测多个端口'
    },
    {
      id: 3,
      type: 'dnsTunnel',
      severity: 'low',
      source: '192.168.1.200',
      target: 'suspicious.domain.com',
      count: 75,
      timestamp: new Date(Date.now() - 900000),
      description: '检测到可疑 DNS 查询模式，可能存在 DNS 隧道'
    }
  ]

  useEffect(() => {
    if (isMonitoring) {
      const interval = setInterval(() => {
        // 模拟实时异常检测
        const randomAnomaly = mockAnomalies[Math.floor(Math.random() * mockAnomalies.length)]
        const newAnomaly = {
          ...randomAnomaly,
          id: Date.now(),
          timestamp: new Date(),
          count: Math.floor(Math.random() * 200) + 50
        }
        
        setDetectedAnomalies(prev => [newAnomaly, ...prev.slice(0, 9)])
      }, 5000)

      return () => clearInterval(interval)
    }
  }, [isMonitoring])

  const handleRuleChange = (ruleType, field, value) => {
    setDetectionRules(prev => ({
      ...prev,
      [ruleType]: {
        ...prev[ruleType],
        [field]: value
      }
    }))
  }

  const getSeverityColor = (severity) => {
    const colors = {
      high: 'text-red-600 bg-red-50 border-red-200',
      medium: 'text-yellow-600 bg-yellow-50 border-yellow-200',
      low: 'text-blue-600 bg-blue-50 border-blue-200'
    }
    return colors[severity] || colors.low
  }

  const getTypeIcon = (type) => {
    const icons = {
      synFlood: Shield,
      portScan: Eye,
      dnsTunnel: Activity
    }
    return icons[type] || AlertTriangle
  }

  const getTypeName = (type) => {
    const names = {
      synFlood: 'SYN Flood',
      portScan: '端口扫描',
      dnsTunnel: 'DNS 隧道'
    }
    return names[type] || type
  }

  const ruleConfigs = [
    {
      key: 'synFlood',
      name: 'SYN Flood 检测',
      icon: Shield,
      color: 'text-red-500',
      description: '检测短时间内大量 SYN 包的异常行为'
    },
    {
      key: 'dnsTunnel',
      name: 'DNS 隧道检测',
      icon: Activity,
      color: 'text-blue-500',
      description: '检测可疑的 DNS 查询模式和数据传输'
    },
    {
      key: 'portScan',
      name: '端口扫描检测',
      icon: Eye,
      color: 'text-orange-500',
      description: '检测针对多个端口的扫描行为'
    }
  ]

  return (
    <div className="space-y-6">
      {/* 检测规则配置 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-800">异常检测规则</h3>
          <button
            onClick={() => setIsMonitoring(!isMonitoring)}
            className={`
              px-4 py-2 rounded-lg font-medium transition-colors duration-200
              ${isMonitoring 
                ? 'bg-red-500 text-white hover:bg-red-600' 
                : 'bg-green-500 text-white hover:bg-green-600'
              }
            `}
          >
            {isMonitoring ? '停止监控' : '开始监控'}
          </button>
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
                    <span className="text-sm text-gray-600">启用检测</span>
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
                      阈值: {rule.threshold}
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
                      时间窗口: {rule.timeWindow}s
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

      {/* 检测结果 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800">检测到的异常</h3>
            <div className="flex items-center space-x-2">
              {isMonitoring && (
                <div className="flex items-center space-x-2 text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm">实时监控中</span>
                </div>
              )}
              <span className="text-sm text-gray-500">
                共 {detectedAnomalies.length} 条记录
              </span>
            </div>
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {detectedAnomalies.length > 0 ? (
            detectedAnomalies.map((anomaly) => {
              const Icon = getTypeIcon(anomaly.type)
              
              return (
                <div key={anomaly.id} className="p-6 hover:bg-gray-50 transition-colors duration-150">
                  <div className="flex items-start space-x-4">
                    <div className={`
                      p-2 rounded-full border
                      ${getSeverityColor(anomaly.severity)}
                    `}>
                      <Icon size={20} />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <h4 className="font-medium text-gray-800">
                            {getTypeName(anomaly.type)}
                          </h4>
                          <span className={`
                            px-2 py-1 text-xs font-medium rounded-full border
                            ${getSeverityColor(anomaly.severity)}
                          `}>
                            {anomaly.severity.toUpperCase()}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                          <Clock size={14} />
                          <span>{anomaly.timestamp.toLocaleTimeString()}</span>
                        </div>
                      </div>
                      
                      <p className="text-gray-600 mb-3">{anomaly.description}</p>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">源地址:</span>
                          <span className="ml-2 font-mono text-gray-800">{anomaly.source}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">目标:</span>
                          <span className="ml-2 font-mono text-gray-800">{anomaly.target}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">计数:</span>
                          <span className="ml-2 font-medium text-gray-800">{anomaly.count}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">严重程度:</span>
                          <span className={`ml-2 font-medium ${
                            anomaly.severity === 'high' ? 'text-red-600' :
                            anomaly.severity === 'medium' ? 'text-yellow-600' : 'text-blue-600'
                          }`}>
                            {anomaly.severity === 'high' ? '高' :
                             anomaly.severity === 'medium' ? '中' : '低'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="p-8 text-center">
              <div className="text-gray-400 mb-2">
                <AlertTriangle className="w-12 h-12 mx-auto" />
              </div>
              <p className="text-gray-500">暂无检测到异常</p>
              <p className="text-sm text-gray-400 mt-1">
                {isMonitoring ? '正在实时监控中...' : '点击"开始监控"开始异常检测'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AnomalyDetection