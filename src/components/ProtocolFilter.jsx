import React from 'react'
import { Wifi, Shield, Globe, Search } from 'lucide-react'

const ProtocolFilter = ({ 
  filters = { tcp: true, udp: true, http: true, dns: true }, 
  onFilterChange = () => {} 
}) => {
  const protocolConfigs = [
    {
      key: 'tcp',
      label: 'TCP',
      icon: Wifi,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      description: 'TCP 連線協定'
    },
    {
      key: 'udp',
      label: 'UDP',
      icon: Shield,
      color: 'text-green-500',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      description: 'UDP 傳輸協定'
    },
    {
      key: 'http',
      label: 'HTTP',
      icon: Globe,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      description: 'HTTP 請求協定'
    },
    {
      key: 'dns',
      label: 'DNS',
      icon: Search,
      color: 'text-orange-500',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      description: 'DNS 查詢協定'
    }
  ]

  const handleToggle = (protocolKey) => {
    const newFilters = {
      ...filters,
      [protocolKey]: !filters[protocolKey]
    }
    onFilterChange(newFilters)
  }

  const activeCount = Object.values(filters).filter(Boolean).length

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">通訊協定過濾器</h3>
        <div className="text-sm text-gray-500">
          已啟用: {activeCount}/{protocolConfigs.length}
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        {protocolConfigs.map((config) => {
          const Icon = config.icon
          const isActive = filters[config.key]
          
          return (
            <div
              key={config.key}
              className={`
                relative p-3 rounded-lg border-2 cursor-pointer transition-all duration-200
                ${isActive 
                  ? `${config.bgColor} ${config.borderColor} shadow-sm` 
                  : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                }
              `}
              onClick={() => handleToggle(config.key)}
            >
              <div className="flex items-center space-x-3">
                <div className={`
                  p-2 rounded-full transition-colors duration-200
                  ${isActive ? config.bgColor : 'bg-gray-200'}
                `}>
                  <Icon 
                    size={16} 
                    className={isActive ? config.color : 'text-gray-400'} 
                  />
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className={`
                      font-medium transition-colors duration-200
                      ${isActive ? 'text-gray-800' : 'text-gray-500'}
                    `}>
                      {config.label}
                    </span>
                    
                    {/* 開關指示器 */}
                    <div className={`
                      w-8 h-4 rounded-full transition-colors duration-200 relative
                      ${isActive ? 'bg-green-400' : 'bg-gray-300'}
                    `}>
                      <div className={`
                        absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-transform duration-200
                        ${isActive ? 'translate-x-4' : 'translate-x-0.5'}
                      `} />
                    </div>
                  </div>
                  
                  <p className={`
                    text-xs mt-1 transition-colors duration-200
                    ${isActive ? 'text-gray-600' : 'text-gray-400'}
                  `}>
                    {config.description}
                  </p>
                </div>
              </div>
              
              {/* 啟用狀態指示器 */}
              {isActive && (
                <div className={`
                  absolute top-2 right-2 w-2 h-2 rounded-full ${config.color.replace('text-', 'bg-')}
                `} />
              )}
            </div>
          )
        })}
      </div>
      
      {/* 快速操作按鈕 */}
      <div className="flex space-x-2 mt-4 pt-3 border-t border-gray-100">
        <button
          onClick={() => onFilterChange({ tcp: true, udp: true, http: true, dns: true })}
          className="flex-1 px-3 py-2 text-sm font-medium text-green-600 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 transition-colors duration-200"
        >
          全部啟用
        </button>
        <button
          onClick={() => onFilterChange({ tcp: false, udp: false, http: false, dns: false })}
          className="flex-1 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors duration-200"
        >
          全部禁用
        </button>
      </div>
    </div>
  )
}

export default ProtocolFilter