import React from 'react'
import { S } from '../lib/swiss-tokens'

const PROTOCOL_CONFIGS = [
  { key: 'tcp',  label: 'TCP',  hex: S.protocol.TCP },
  { key: 'udp',  label: 'UDP',  hex: S.protocol.UDP },
  { key: 'http', label: 'HTTP', hex: S.protocol.HTTP },
  { key: 'dns',  label: 'DNS',  hex: S.protocol.DNS },
  { key: 'icmp', label: 'ICMP', hex: S.protocol.ICMP },
]

const ALL_TRUE = Object.fromEntries(PROTOCOL_CONFIGS.map(c => [c.key, true]))
const ALL_FALSE = Object.fromEntries(PROTOCOL_CONFIGS.map(c => [c.key, false]))

const ProtocolFilter = ({
  filters = ALL_TRUE,
  onFilterChange = () => {},
  compact = false,
}) => {
  const handleToggle = (protocolKey) => {
    onFilterChange({ ...filters, [protocolKey]: !filters[protocolKey] })
  }

  // Swiss ProtoChip style (used in sidebar compact mode)
  if (compact) {
    return (
      <div style={{ padding: '0 4px 8px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {PROTOCOL_CONFIGS.map(config => {
            const isActive = filters[config.key]
            const c = config.hex
            return (
              <button
                key={config.key}
                type="button"
                onClick={() => handleToggle(config.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 10px', borderRadius: S.radius.sm,
                  border: `1.5px solid ${isActive ? c + '55' : S.border}`,
                  background: isActive ? c + '10' : 'transparent',
                  color: isActive ? c : S.text.faint,
                  fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
                  fontFamily: S.font.mono,
                  transition: 'all 0.15s',
                }}
              >
                <span style={{
                  width: 7, height: 7, borderRadius: 1.5,
                  background: isActive ? c : S.text.faint,
                }} />
                {config.label}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // Full mode (rarely used, kept for compatibility)
  return (
    <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: S.radius.md, padding: 16 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
        {PROTOCOL_CONFIGS.map(config => {
          const isActive = filters[config.key]
          const c = config.hex
          return (
            <button
              key={config.key}
              type="button"
              onClick={() => handleToggle(config.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 10px', borderRadius: S.radius.sm,
                border: `1.5px solid ${isActive ? c + '55' : S.border}`,
                background: isActive ? c + '10' : 'transparent',
                color: isActive ? c : S.text.faint,
                fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
                fontFamily: S.font.mono,
                transition: 'all 0.15s',
              }}
            >
              <span style={{
                width: 7, height: 7, borderRadius: 1.5,
                background: isActive ? c : S.text.faint,
              }} />
              {config.label}
            </button>
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12, paddingTop: 8, borderTop: `1px solid ${S.border}` }}>
        <button
          onClick={() => onFilterChange(ALL_TRUE)}
          style={{ flex: 1, padding: '5px 10px', fontSize: 11, fontWeight: 500, color: S.protocol.HTTP, background: S.protocol.HTTP + '14', border: `1px solid ${S.protocol.HTTP}33`, borderRadius: S.radius.sm, cursor: 'pointer' }}
        >
          全部啟用
        </button>
        <button
          onClick={() => onFilterChange(ALL_FALSE)}
          style={{ flex: 1, padding: '5px 10px', fontSize: 11, fontWeight: 500, color: S.protocol.ICMP, background: S.protocol.ICMP + '14', border: `1px solid ${S.protocol.ICMP}33`, borderRadius: S.radius.sm, cursor: 'pointer' }}
        >
          全部禁用
        </button>
      </div>
    </div>
  )
}

export default ProtocolFilter
