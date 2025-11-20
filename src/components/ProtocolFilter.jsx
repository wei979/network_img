import React from 'react'
import { Wifi, Shield, Globe, Search, Check, X } from 'lucide-react'

const ProtocolFilter = ({ 
  filters = { tcp: true, udp: true, http: true, dns: true }, 
  onFilterChange = () => {} 
}) => {
  const protocolConfigs = [
    { key: 'tcp', label: 'TCP', icon: Wifi, color: 'blue', description: '傳輸控制協定' },
    { key: 'udp', label: 'UDP', icon: Shield, color: 'green', description: '使用者資料包協定' },
    { key: 'http', label: 'HTTP', icon: Globe, color: 'purple', description: '超文本傳輸協定' },
    { key: 'dns', label: 'DNS', icon: Search, color: 'orange', description: '網域名稱系統' }
  ];

  const handleToggle = (protocolKey) => {
    onFilterChange({ ...filters, [protocolKey]: !filters[protocolKey] });
  }

  const activeCount = Object.values(filters).filter(Boolean).length;
  
  const colorClasses = {
    blue: { text: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', ring: 'ring-blue-500/50' },
    green: { text: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30', ring: 'ring-green-500/50' },
    purple: { text: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30', ring: 'ring-purple-500/50' },
    orange: { text: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30', ring: 'ring-orange-500/50' },
  };

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-100">協議過濾器</h3>
        <div className="text-sm text-slate-400">
          已啟用: {activeCount} / {protocolConfigs.length}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {protocolConfigs.map((config) => {
          const Icon = config.icon;
          const isActive = filters[config.key];
          const colors = colorClasses[config.color];
          
          return (
            <div
              key={config.key}
              className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                isActive 
                  ? `${colors.bg} ${colors.border} ring-2 ${colors.ring}` 
                  : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
              }`}
              onClick={() => handleToggle(config.key)}
            >
              <div className="flex items-start">
                <div className={`p-2 rounded-lg ${isActive ? colors.bg : 'bg-slate-700'}`}>
                  <Icon size={20} className={isActive ? colors.text : 'text-slate-500'} />
                </div>
                <div className="ml-3 flex-1">
                  <span className={`font-semibold ${isActive ? 'text-slate-100' : 'text-slate-400'}`}>
                    {config.label}
                  </span>
                  <p className={`text-xs mt-1 ${isActive ? 'text-slate-300' : 'text-slate-500'}`}>
                    {config.description}
                  </p>
                </div>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-xs ${isActive ? 'bg-green-500' : 'bg-slate-600'}`}>
                  {isActive ? <Check size={14} /> : <X size={14} />}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      
      <div className="flex space-x-3 mt-6 pt-4 border-t border-slate-800">
        <button
          onClick={() => onFilterChange({ tcp: true, udp: true, http: true, dns: true })}
          className="flex-1 px-3 py-2 text-sm font-medium text-green-300 bg-green-500/10 border border-green-500/30 rounded-md hover:bg-green-500/20 transition-colors"
        >
          全部啟用
        </button>
        <button
          onClick={() => onFilterChange({ tcp: false, udp: false, http: false, dns: false })}
          className="flex-1 px-3 py-2 text-sm font-medium text-red-300 bg-red-500/10 border border-red-500/30 rounded-md hover:bg-red-500/20 transition-colors"
        >
          全部禁用
        </button>
      </div>
    </div>
  )
}

export default ProtocolFilter