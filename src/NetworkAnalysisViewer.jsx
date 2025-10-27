import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  Clock,
  Gamepad2,
  RefreshCcw,
  Shield,
  TrendingUp,
  UploadCloud,
  Wifi
} from 'lucide-react'
import MindMap from './MindMap'
import ProtocolTimelinePreview from './ProtocolTimelinePreview'

const ANALYSIS_PATH = '/data/network_analysis_results.json'
const MIND_MAP_PATH = '/data/network_mind_map.json'

const API_ANALYSIS_URL = '/api/analysis'
const API_ANALYZE_URL = '/api/analyze'

const ANALYZER_API_ENABLED = import.meta.env.VITE_ANALYZER_API === 'true'

const toTopList = (raw, limit = 5) => {
  if (!raw) {
    return []
  }

  if (Array.isArray(raw)) {
    return raw
      .slice(0, limit)
      .map((entry) => {
        if (Array.isArray(entry)) {
          return { label: entry[0], count: entry[1] }
        }
        if (entry && typeof entry === 'object') {
          return { label: entry.name, count: entry.count }
        }
        return { label: String(entry), count: 0 }
      })
  }

  return Object.entries(raw)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => (b.count || 0) - (a.count || 0))
    .slice(0, limit)
}

const formatNumber = (value, fraction = 0) => {
  if (value === undefined || value === null) {
    return '0'
  }

  const number = Number(value)
  if (Number.isNaN(number)) {
    return String(value)
  }

  return number.toLocaleString(undefined, {
    minimumFractionDigits: fraction,
    maximumFractionDigits: fraction
  })
}

const computeLatencySummary = (latency) => {
  if (!latency) {
    return {
      averageDelay: 0,
      stdDelay: 0,
      handshakeCount: 0,
      pingCount: 0
    }
  }

  const delays = Array.isArray(latency.inter_packet_delays)
    ? latency.inter_packet_delays.map((entry) => entry.delay)
    : []

  const averageDelay = delays.length
    ? delays.reduce((sum, item) => sum + item, 0) / delays.length
    : 0

  const stdDelay = delays.length > 1
    ? Math.sqrt(
        delays.reduce((sum, item) => sum + (item - averageDelay) ** 2, 0) /
          delays.length
      )
    : 0

  return {
    averageDelay,
    stdDelay,
    handshakeCount: Array.isArray(latency.tcp_handshakes)
      ? latency.tcp_handshakes.length
      : 0,
    pingCount: Array.isArray(latency.ping_responses)
      ? latency.ping_responses.length
      : 0
  }
}

const computeHealth = (packetLossSummary, latencySummary) => {
  if (packetLossSummary.total > 120 || latencySummary.averageDelay > 120) {
    return {
      label: '嚴重',
      color: 'text-red-500',
      icon: AlertTriangle
    }
  }

  if (packetLossSummary.total > 40 || latencySummary.averageDelay > 60) {
    return {
      label: '需留意',
      color: 'text-yellow-500',
      icon: AlertTriangle
    }
  }

  return {
    label: '良好',
    color: 'text-green-500',
    icon: Shield
  }
}

const buildConnectionSummary = (connections, limit = 6) => {
  if (!Array.isArray(connections)) {
    return []
  }

  return connections.slice(0, limit).map((connection) => {
    const srcPort = connection.src_port ? `:${connection.src_port}` : ''
    const dstPort = connection.dst_port ? `:${connection.dst_port}` : ''
    return {
      id: `${connection.protocol}-${connection.src_ip}-${connection.dst_ip}-${connection.src_port}-${connection.dst_port}`,
      protocol: connection.protocol,
      packets: connection.packet_count,
      label: `${connection.src_ip}${srcPort} -> ${connection.dst_ip}${dstPort}`
    }
  })
}

const NetworkAnalysisViewer = () => {
  const [analysisData, setAnalysisData] = useState(null)
  const [mindMapData, setMindMapData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const fileInputRef = useRef(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    setStatusMessage('')

    try {
      let analysisJson = null
      let mindMapJson = null

      if (ANALYZER_API_ENABLED) {
        try {
          const apiResponse = await fetch(API_ANALYSIS_URL, { cache: 'no-store' })
          if (apiResponse.ok) {
            const payload = await apiResponse.json()
            analysisJson = payload.analysis ???? payload
            mindMapJson = analysisJson?.mind_map ???? null
          } else if (apiResponse.status !== 404) {
            console.warn('API analysis request failed', apiResponse.status)
          }
        } catch (apiError) {
          console.warn('Unable to reach analyzer API', apiError)
        }
      }

      if (!analysisJson) {
        const analysisResponse = await fetch(ANALYSIS_PATH, { cache: 'no-store' }).catch(() => null)
        if (!analysisResponse || !analysisResponse.ok) {
          throw new Error('????????????????')
        }

        analysisJson = await analysisResponse.json()

        const mindMapResponse = await fetch(MIND_MAP_PATH, { cache: 'no-store' }).catch(() => null)
        if (mindMapResponse && mindMapResponse.ok) {
          mindMapJson = await mindMapResponse.json()
        } else {
          mindMapJson = analysisJson.mind_map ???? null
        }
      }

      setAnalysisData(analysisJson)
      setMindMapData(mindMapJson ???? null)
      setStatusMessage(ANALYZER_API_ENABLED ? '????????????????????' : '?????????????????')
    } catch (err) {
      console.error(err)
      setStatusMessage('')
      setError(err.message || '????????????')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleUploadClick = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
      fileInputRef.current.click()
    }
  }, [])

  const handleFileChange = useCallback(
    async (event) => {
      const input = event.target
      const selectedFile = input.files?.[0]
      if (!selectedFile) {
        return
      }

      input.value = ''

      if (!analysisData) {
        setLoading(true)
      }

      setUploading(true)
      setError(null)
      setStatusMessage('正在處理封包...')

      try {
        const formData = new FormData()
        formData.append('file', selectedFile)

        const response = await fetch(API_ANALYZE_URL, {
          method: 'POST',
          body: formData
        })

        let payload = null
        try {
          payload = await response.json()
        } catch (parseError) {
          payload = null
        }

        if (!response.ok) {
          const detail = payload?.detail ???? '上傳封包失敗'
          throw new Error(detail)
        }

        const analysisJson = payload?.analysis
        if (!analysisJson) {
          throw new Error('伺服器回傳分析錯誤')
        }

        setAnalysisData(analysisJson)
        setMindMapData(analysisJson.mind_map ???? null)
        setStatusMessage(`已選擇 ${selectedFile.name} 等待分析`)
      } catch (err) {
        console.error(err)
        setStatusMessage('')
        setError(err.message || '上傳封包失敗')
      } finally {
        setUploading(false)
        setLoading(false)
      }
    },
    [analysisData]
  )

  useEffect(() => {
    loadData()
  }, [loadData])

  const packetLossSummary = useMemo(() => {
    const issues = Array.isArray(analysisData?.packet_loss)
      ? analysisData.packet_loss
      : []

    let retransmissions = 0
    let sequenceGaps = 0

    issues.forEach((issue) => {
      if (issue.type === 'retransmission') {
        retransmissions += 1
      } else if (issue.type === 'sequence_gap') {
        sequenceGaps += 1
      }
    })

    return {
      total: issues.length,
      retransmissions,
      sequenceGaps
    }
  }, [analysisData])

  const latencySummary = useMemo(
    () => computeLatencySummary(analysisData?.latency),
    [analysisData]
  )

  const basicStats = analysisData?.basic_stats ???? {}
  const totalPackets = basicStats.total_packets ???? 0
  const protocols = Object.entries(basicStats.protocols ???? {})
    .sort((a, b) => b[1] - a[1])
    .map(([protocol, count]) => ({ protocol, count }))

  const packetSizeSummary = basicStats.packet_size_summary ???? {
    average: 0,
    min: 0,
    max: 0
  }

  const intervalSummary = basicStats.time_interval_summary ???? {
    average_ms: 0,
    min_ms: 0,
    max_ms: 0
  }

  const topSources = useMemo(
    () => toTopList(basicStats.src_ips, 5),
    [basicStats.src_ips]
  )
  const topDestinations = useMemo(
    () => toTopList(basicStats.dst_ips, 5),
    [basicStats.dst_ips]
  )
  const topConnections = useMemo(
    () => buildConnectionSummary(basicStats.top_connections, 6),
    [basicStats.top_connections]
  )

  const health = computeHealth(packetLossSummary, latencySummary)
  const HealthIcon = health.icon

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Activity className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">????????...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center max-w-md">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-white text-lg mb-2">{error}</p>
          <button
            type="button"
            onClick={loadData}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md"
          >
            <RefreshCcw className="w-4 h-4" />
            <span>????</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              ????????
            </h1>
            <p className="text-gray-400 mt-2">
              ?????? Wireshark ?????????????????
            </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleUploadClick}
              disabled={loading || uploading}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-md disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <UploadCloud className="w-4 h-4" />
              <span>{uploading ? '???...' : '????'}</span>
            </button>
            <button
              type="button"
              onClick={loadData}
              disabled={loading || uploading}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <RefreshCcw className="w-4 h-4" />
              <RefreshCcw className="w-4 h-4" />
              <span>????</span>
          </div>
        </header>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pcap,.pcapng"
          onChange={handleFileChange}
          className="hidden"
        />

        {statusMessage && (
          <div className="bg-blue-900/30 border border-blue-500/40 text-blue-100 px-4 py-2 rounded-md">
            {statusMessage}
          </div>
        )}

        <section className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center space-x-4">
              <div className="flex items-center justify-center w-14 h-14 rounded-full bg-gray-900 border border-gray-700">
                <HealthIcon className={`w-8 h-8 ${health.color}`} />
              </div>
              <div>
                <h2 className="text-xl font-semibold">網路健康指標</h2>
                <p className={`text-lg font-medium ${health.color}`}>{health.label}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6 text-sm text-gray-300">
              <div>
                <p className="text-gray-400">封包總數</p>
                <p className="text-gray-400">封包總數</p>
              </div>
              <div>
                <p className="text-gray-400">封包遺失</p>
                <p className="text-gray-400">偵測遺失封包</p>
              </div>
              <div>
                <p className="text-gray-400">平均封包間隔</p>
                <p className="text-gray-400">平均封包間隔</p>
              </div>
              <div>
                <p className="text-gray-400">平均即時延遲</p>
                <p className="text-gray-400">平均往返延遲</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <AlertTriangle className="w-8 h-8 text-red-500" />
              <span className="text-2xl font-bold text-red-500">{formatNumber(packetLossSummary.total)}</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">封包遺失重點</h3>
            <p className="text-gray-400 text-sm">重傳次數：{formatNumber(packetLossSummary.retransmissions)}</p>
            <p className="text-gray-400 text-sm">序號異常：{formatNumber(packetLossSummary.sequenceGaps)}</p>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <Clock className="w-8 h-8 text-blue-500" />
              <span className="text-2xl font-bold text-blue-500">{formatNumber(latencySummary.averageDelay, 2)} ms</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">延遲概況</h3>
            <p className="text-gray-400 text-sm">延遲標準差：{formatNumber(latencySummary.stdDelay, 2)} ms</p>
            <p className="text-gray-400 text-sm">TCP 握手數：{formatNumber(latencySummary.handshakeCount)}</p>
            <p className="text-gray-400 text-sm">Ping 回應：{formatNumber(latencySummary.pingCount)}</p>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <Wifi className="w-8 h-8 text-green-500" />
              <span className="text-2xl font-bold text-green-500">{formatNumber(packetSizeSummary.average, 2)} B</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">封包大小</h3>
            <p className="text-gray-400 text-sm">範圍：{formatNumber(packetSizeSummary.min)} - {formatNumber(packetSizeSummary.max)} B</p>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="w-8 h-8 text-purple-500" />
              <span className="text-2xl font-bold text-purple-500">{protocols.length}</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">協定分布</h3>
            <ul className="space-y-1 text-sm text-gray-300">
              {protocols.slice(0, 4).map((item) => (
                <li key={item.protocol} className="flex items-center justify-between">
                  <span>{item.protocol}</span>
                  <span>{formatNumber(item.count)}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <ProtocolTimelinePreview />

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-xl font-semibold mb-4 flex items-center">
              <Wifi className="w-6 h-6 mr-2 text-blue-500" />
              協定封包明細
            </h3>
            <div className="space-y-3">
              {protocols.map(({ protocol, count }) => {
                const percentage = totalPackets ? ((count / totalPackets) * 100).toFixed(1) : '0.0'
                return (
                  <div key={protocol} className="flex items-center justify-between">
                    <span className="font-medium">{protocol}</span>
                    <div className="text-right">
                      <span className="text-lg font-semibold">{formatNumber(count)}</span>
                      <span className="text-gray-400 ml-2">({percentage}%)</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-xl font-semibold mb-4">主要來源 / 目的 IP</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-semibold text-gray-300 mb-2">來源</h4>
                <ul className="space-y-2">
                  {topSources.map((item, index) => (
                    <li key={item.label} className="flex items-center justify-between text-sm text-gray-300">
                      <span className="font-mono">
                        <span className="text-gray-500 mr-2">#{index + 1}</span>
                        {item.label}
                      </span>
                      <span>{formatNumber(item.count)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-300 mb-2">目的</h4>
                <ul className="space-y-2">
                  {topDestinations.map((item, index) => (
                    <li key={item.label} className="flex items-center justify-between text-sm text-gray-300">
                      <span className="font-mono">
                        <span className="text-gray-500 mr-2">#{index + 1}</span>
                        {item.label}
                      </span>
                      <span>{formatNumber(item.count)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-xl font-semibold mb-4">封包互動關係圖</h3>
          <MindMap data={mindMapData} />
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-xl font-semibold mb-4">主要封包連線</h3>
            <div className="space-y-3">
              {topConnections.map((connection) => (
                <div key={connection.id} className="p-3 bg-gray-900/60 rounded-lg border border-gray-700">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-blue-300">{connection.protocol}</span>
                    <span className="text-gray-400">封包數：{formatNumber(connection.packets)}</span>
                  </div>
                  <div className="text-sm text-gray-300 mt-1 font-mono break-all">
                    {connection.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-xl font-semibold mb-4 flex items-center">
              <Gamepad2 className="w-6 h-6 mr-2 text-green-500" />
              遊戲連線建議
            </h3>
            {packetLossSummary.total > 0 && (
              <div className="mb-4 p-4 bg-red-900/20 border border-red-500/30 rounded-lg text-sm text-gray-300 space-y-2">
                <h4 className="text-red-400 font-semibold">封包遺失改善建議</h4>
                <ul className="list-disc list-inside space-y-1">
                  <li>檢查終端設備與路由器連線是否穩定</li>
                  <li>重新啟動網路設備或更新韌體</li>
                  <li>調整頻寬使用或設定 QoS 優先權</li>
                  <li>聯絡 ISP 確認是否有區域性異常</li>
                  <li>避免大量上下載占用剩餘頻寬</li>
                </ul>
              </div>
            )}

            {latencySummary.averageDelay > 50 && (
              <div className="mb-4 p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg text-sm text-gray-300 space-y-1">
                <h4 className="text-yellow-400 font-semibold">延遲改善建議</h4>
                <ul className="list-disc list-inside space-y-1">
                  <li>觀察高延遲時段與使用情境，適時調整遊戲時間</li>
                  <li>在路由器啟用 QoS，確保遊戲流量優先</li>
                  <li>排除大量佔用頻寬的背景程式</li>
                  <li>必要時更換伺服器或改用其他連線方式</li>
                </ul>
              </div>
            )}

            <div className="p-4 bg-green-900/20 border border-green-500/30 rounded-lg text-sm text-gray-300 space-y-1">
              <h4 className="text-green-400 font-semibold">長期最佳化建議</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>保持有線連線並確保設備散熱良好</li>
                <li>定期評估 ISP 服務品質與可用頻寬</li>
                <li>優先使用 Riot 推薦的伺服器與路由</li>
                <li>與隊友協調測試不同連線方案</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default NetworkAnalysisViewer

