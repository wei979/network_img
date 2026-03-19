import React from 'react'
import { Wifi, Shield, Globe, Search, Radio } from 'lucide-react'

const PROTOCOL_CONFIGS = [
  { key: 'tcp',  label: 'TCP',  icon: Wifi,   hex: '#38bdf8', description: 'TCP 連線協定' },
  { key: 'udp',  label: 'UDP',  icon: Shield, hex: '#60a5fa', description: 'UDP 傳輸協定' },
  { key: 'http', label: 'HTTP', icon: Globe,  hex: '#a855f7', description: 'HTTP 請求協定' },
  { key: 'dns',  label: 'DNS',  icon: Search, hex: '#f97316', description: 'DNS 查詢協定' },
  { key: 'icmp', label: 'ICMP', icon: Radio,  hex: '#facc15', description: 'ICMP Ping 協定' },
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

  const activeCount = PROTOCOL_CONFIGS.filter(c => filters[c.key]).length

  // 暗色緊湊模式（sidebar 用）
  if (compact) {
    return (
      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-slate-400">協定篩選</span>
          <span className="text-xs text-slate-500">{activeCount}/{PROTOCOL_CONFIGS.length}</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PROTOCOL_CONFIGS.map(config => {
            const Icon = config.icon
            const isActive = filters[config.key]
            return (
              <button
                key={config.key}
                type="button"
                title={config.description}
                onClick={() => handleToggle(config.key)}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all duration-150 border ${
                  isActive
                    ? 'border-slate-500 bg-slate-700/80 text-slate-100'
                    : 'border-slate-700 bg-slate-800/50 text-slate-500 hover:text-slate-300'
                }`}
              >
                <Icon size={11} style={isActive ? { color: config.hex } : undefined} />
                {config.label}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // 原始亮色完整模式
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">通訊協定過濾器</h3>
        <div className="text-sm text-gray-500">
          已啟用: {activeCount}/{PROTOCOL_CONFIGS.length}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {PROTOCOL_CONFIGS.map((config) => {
          const Icon = config.icon
          const isActive = filters[config.key]
          return (
            <div
              key={config.key}
              className={`relative p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                isActive ? 'bg-slate-50 border-slate-300 shadow-sm' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
              }`}
              onClick={() => handleToggle(config.key)}
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-full" style={isActive ? { backgroundColor: config.hex + '22' } : undefined}>
                  <Icon size={16} style={{ color: isActive ? config.hex : '#9ca3af' }} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className={`font-medium ${isActive ? 'text-gray-800' : 'text-gray-500'}`}>
                      {config.label}
                    </span>
                    <div className={`w-8 h-4 rounded-full relative ${isActive ? 'bg-green-400' : 'bg-gray-300'}`}>
                      <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-transform duration-200 ${isActive ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </div>
                  </div>
                  <p className={`text-xs mt-1 ${isActive ? 'text-gray-600' : 'text-gray-400'}`}>
                    {config.description}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex space-x-2 mt-4 pt-3 border-t border-gray-100">
        <button
          onClick={() => onFilterChange(ALL_TRUE)}
          className="flex-1 px-3 py-2 text-sm font-medium text-green-600 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 transition-colors"
        >
          全部啟用
        </button>
        <button
          onClick={() => onFilterChange(ALL_FALSE)}
          className="flex-1 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors"
        >
          全部禁用
        </button>
      </div>
    </div>
  )
}

export default ProtocolFilter