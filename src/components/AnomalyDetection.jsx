import React, { useState, useEffect } from 'react'
import { AlertTriangle, Shield, Eye, Activity, Clock, Loader2 } from 'lucide-react'
import { S } from '../lib/swiss-tokens'

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

  const getSeverityStyle = (severity) => {
    const map = {
      high:     { color: S.protocol.ICMP, bg: `${S.protocol.ICMP}18`, border: `${S.protocol.ICMP}40` },
      critical: { color: S.protocol.ICMP, bg: `${S.protocol.ICMP}18`, border: `${S.protocol.ICMP}40` },
      medium:   { color: '#eab308',       bg: '#eab30818',            border: '#eab30840' },
      low:      { color: S.protocol.UDP,  bg: `${S.protocol.UDP}18`,  border: `${S.protocol.UDP}40` },
      normal:   { color: S.protocol.HTTP, bg: `${S.protocol.HTTP}18`, border: `${S.protocol.HTTP}40` },
    }
    return map[severity] || map.low
  }

  const getSeverityLabel = (severity) => {
    const labels = { high: '高', critical: '極高', medium: '中', low: '低', normal: '正常' }
    return labels[severity] || severity
  }

  const ruleConfigs = [
    { key: 'synFlood', name: 'SYN Flood 偵測', icon: Shield, color: S.protocol.ICMP, description: '偵測短時間內大量 SYN 封包的異常行為' },
    { key: 'dnsTunnel', name: 'DNS 隧道偵測', icon: Activity, color: S.protocol.UDP, description: '偵測可疑的 DNS 查詢模式和資料傳輸' },
    { key: 'portScan', name: '連接埠掃描偵測', icon: Eye, color: S.accent, description: '偵測針對多個連接埠的掃描行為' },
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, fontFamily: S.font.sans }}>
      {/* 偵測規則配置 */}
      <div style={{ background: S.surface, borderRadius: S.radius.md, border: `1px solid ${S.border}`, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: S.text.primary, margin: 0 }}>異常偵測規則</h3>
          <span style={{ fontSize: '0.75rem', color: S.text.tertiary }}>參考用（尚未連接後端）</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24 }}>
          {ruleConfigs.map((config) => {
            const Icon = config.icon
            const rule = detectionRules[config.key]
            return (
              <div key={config.key} style={{ border: `1px solid ${S.border}`, borderRadius: S.radius.md, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <div style={{ padding: 8, background: S.bgRaised, borderRadius: S.radius.sm }}>
                    <Icon size={20} style={{ color: config.color }} />
                  </div>
                  <div>
                    <h4 style={{ fontWeight: 500, color: S.text.primary, margin: 0 }}>{config.name}</h4>
                    <p style={{ fontSize: '0.875rem', color: S.text.secondary, margin: 0 }}>{config.description}</p>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.875rem', color: S.text.secondary }}>啟用偵測</span>
                    <label style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={rule.enabled}
                        onChange={(e) => handleRuleChange(config.key, 'enabled', e.target.checked)}
                        style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', borderWidth: 0 }}
                      />
                      <div style={{
                        width: 44, height: 24, borderRadius: 12,
                        background: rule.enabled ? S.protocol.HTTP : S.borderStrong,
                        position: 'relative', transition: 'background 0.2s',
                      }}>
                        <div style={{
                          position: 'absolute', top: 2, left: rule.enabled ? 22 : 2,
                          width: 20, height: 20, borderRadius: '50%',
                          background: S.text.primary, transition: 'left 0.2s',
                        }} />
                      </div>
                    </label>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', color: S.text.secondary, marginBottom: 4 }}>
                      閾值: {rule.threshold}
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="500"
                      value={rule.threshold}
                      onChange={(e) => handleRuleChange(config.key, 'threshold', parseInt(e.target.value))}
                      style={{ width: '100%', accentColor: S.accent }}
                      disabled={!rule.enabled}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', color: S.text.secondary, marginBottom: 4 }}>
                      時間範圍: {rule.timeWindow}s
                    </label>
                    <input
                      type="range"
                      min="30"
                      max="600"
                      value={rule.timeWindow}
                      onChange={(e) => handleRuleChange(config.key, 'timeWindow', parseInt(e.target.value))}
                      style={{ width: '100%', accentColor: S.accent }}
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
      <div style={{ background: S.surface, borderRadius: S.radius.md, border: `1px solid ${S.border}` }}>
        <div style={{ padding: 24, borderBottom: `1px solid ${S.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: S.text.primary, margin: 0 }}>偵測結果</h3>
            <span style={{ fontSize: '0.875rem', color: S.text.tertiary }}>
              {loading ? '載入中...' : `共 ${detectedAnomalies.length} 條紀錄`}
            </span>
          </div>
        </div>

        {/* 整體攻擊指標摘要 */}
        {attackData && !loading && (
          <div style={{ padding: 16, background: S.bgRaised, borderBottom: `1px solid ${S.border}` }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16, fontSize: '0.875rem' }}>
              <div>
                <span style={{ color: S.text.tertiary }}>TCP 封包總數</span>
                <p style={{ fontFamily: S.font.mono, fontWeight: 500, color: S.text.primary, margin: 0 }}>{attackData.metrics?.total_tcp_packets?.toLocaleString() ?? '—'}</p>
              </div>
              <div>
                <span style={{ color: S.text.tertiary }}>異常評分</span>
                <p style={{ fontWeight: 500, color: (attackData.attack_detection?.anomaly_score ?? 0) > 50 ? S.protocol.ICMP : S.protocol.HTTP, margin: 0 }}>
                  {attackData.attack_detection?.anomaly_score ?? 0}/100
                </p>
              </div>
              <div>
                <span style={{ color: S.text.tertiary }}>信心度</span>
                <p style={{ fontWeight: 500, color: S.text.primary, margin: 0 }}>{((attackData.attack_detection?.confidence ?? 0) * 100).toFixed(0)}%</p>
              </div>
              <div>
                <span style={{ color: S.text.tertiary }}>連線速率</span>
                <p style={{ fontFamily: S.font.mono, fontWeight: 500, color: S.text.primary, margin: 0 }}>{attackData.metrics?.connections_per_second ?? '—'}/s</p>
              </div>
            </div>
          </div>
        )}

        <div>
          {loading ? (
            <div style={{ padding: 32, textAlign: 'center' }}>
              <Loader2 size={32} style={{ color: S.text.tertiary, margin: '0 auto', display: 'block', animation: 'spin 1s linear infinite' }} />
              <p style={{ color: S.text.tertiary, marginTop: 8 }}>正在載入偵測資料...</p>
            </div>
          ) : error ? (
            <div style={{ padding: 32, textAlign: 'center' }}>
              <AlertTriangle size={48} style={{ color: '#eab308', margin: '0 auto', display: 'block' }} />
              <p style={{ color: S.text.tertiary, marginTop: 8 }}>無法取得偵測資料</p>
              <p style={{ fontSize: '0.875rem', color: S.text.faint, marginTop: 4 }}>請確認後端已啟動並已上傳 PCAP 檔案</p>
            </div>
          ) : detectedAnomalies.length > 0 ? (
            detectedAnomalies.map((anomaly) => {
              const sev = getSeverityStyle(anomaly.severity)
              return (
                <div key={anomaly.id} style={{ padding: 24, borderBottom: `1px solid ${S.border}` }}
                  onMouseEnter={(e) => e.currentTarget.style.background = S.surfaceHover}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                    <div style={{ padding: 8, borderRadius: '50%', border: `1px solid ${sev.border}`, background: sev.bg }}>
                      <Shield size={20} style={{ color: sev.color }} />
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <h4 style={{ fontWeight: 500, color: S.text.primary, margin: 0 }}>{anomaly.type}</h4>
                          <span style={{
                            padding: '2px 8px', fontSize: '0.75rem', fontWeight: 500,
                            borderRadius: S.radius.sm,
                            border: `1px solid ${sev.border}`,
                            background: sev.bg, color: sev.color,
                          }}>
                            {getSeverityLabel(anomaly.severity)}
                          </span>
                        </div>
                      </div>

                      <p style={{ color: S.text.secondary, marginBottom: 12 }}>{anomaly.description}</p>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16, fontSize: '0.875rem' }}>
                        <div>
                          <span style={{ color: S.text.tertiary }}>來源:</span>
                          <span style={{ marginLeft: 8, fontFamily: S.font.mono, color: S.text.primary }}>{anomaly.source}</span>
                        </div>
                        <div>
                          <span style={{ color: S.text.tertiary }}>目標:</span>
                          <span style={{ marginLeft: 8, fontFamily: S.font.mono, color: S.text.primary }}>{anomaly.target}</span>
                        </div>
                        <div>
                          <span style={{ color: S.text.tertiary }}>封包數:</span>
                          <span style={{ marginLeft: 8, fontWeight: 500, color: S.text.primary }}>{anomaly.count.toLocaleString()}</span>
                        </div>
                        <div>
                          <span style={{ color: S.text.tertiary }}>信心度:</span>
                          <span style={{ marginLeft: 8, fontWeight: 500, color: S.text.primary }}>{(anomaly.confidence * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          ) : (
            <div style={{ padding: 32, textAlign: 'center' }}>
              <Shield size={48} style={{ color: S.protocol.HTTP, margin: '0 auto', display: 'block' }} />
              <p style={{ fontWeight: 500, color: S.text.secondary, marginTop: 8 }}>未偵測到攻擊行為</p>
              <p style={{ fontSize: '0.875rem', color: S.text.tertiary, marginTop: 4 }}>
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
