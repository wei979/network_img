import React, { useState } from 'react'
import ProtocolFilter from './components/ProtocolFilter'
import './App.css'

const ProtocolFilterTest = () => {
  const [filters, setFilters] = useState({
    tcp: true,
    udp: true,
    http: true,
    dns: true
  })

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters)
    console.log('通訊協定過濾器狀態更新:', newFilters)
  }

  // 模擬網路資料封包
  const mockPackets = [
    { id: 1, protocol: 'tcp', source: '192.168.1.100', dest: '192.168.1.1', port: 80, time: '10:30:15' },
    { id: 2, protocol: 'udp', source: '192.168.1.100', dest: '8.8.8.8', port: 53, time: '10:30:16' },
    { id: 3, protocol: 'http', source: '192.168.1.100', dest: '203.208.60.1', port: 443, time: '10:30:17' },
    { id: 4, protocol: 'dns', source: '192.168.1.100', dest: '8.8.8.8', port: 53, time: '10:30:18' },
    { id: 5, protocol: 'tcp', source: '192.168.1.100', dest: '192.168.1.1', port: 22, time: '10:30:19' },
    { id: 6, protocol: 'udp', source: '192.168.1.100', dest: '192.168.1.255', port: 137, time: '10:30:20' }
  ]

  // 根據過濾器篩選資料封包
  const filteredPackets = mockPackets.filter(packet => filters[packet.protocol])

  const getProtocolColor = (protocol) => {
    const colors = {
      tcp: 'text-blue-300 bg-blue-900',
      udp: 'text-green-300 bg-green-900',
      http: 'text-purple-300 bg-purple-900',
      dns: 'text-orange-300 bg-orange-900'
    }
    return colors[protocol] || 'text-slate-300 bg-slate-900'
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-100 mb-2">通訊協定過濾器測試</h1>
          <p className="text-slate-300">
            測試網路通訊協定過濾功能，可以選擇性顯示不同類型的網路流量
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 通訊協定過濾器 */}  
          <div className="lg:col-span-1">
            <ProtocolFilter 
              filters={filters}
              onFilterChange={handleFilterChange}
            />
            
            {/* 過濾統計 */}
            <div className="mt-4 bg-slate-800 rounded-lg shadow-sm border border-slate-700 p-4">
              <h4 className="font-semibold text-slate-100 mb-3">過濾統計</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-300">總資料封包:</span>
                  <span className="font-medium">{mockPackets.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-300">已過濾:</span>
                  <span className="font-medium text-green-500">{filteredPackets.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-300">已隱藏:</span>
                  <span className="font-medium text-red-500">{mockPackets.length - filteredPackets.length}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 資料封包列表 */}
          <div className="lg:col-span-2">
            <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700">
              <div className="p-4 border-b border-slate-700">
                <h3 className="text-lg font-semibold text-slate-100">網路資料封包</h3>
                <p className="text-sm text-slate-300 mt-1">
                  顯示 {filteredPackets.length} 個資料封包 (共 {mockPackets.length} 個)
                </p>
              </div>
              
              <div className="overflow-hidden">
                {filteredPackets.length > 0 ? (
                  <div className="divide-y divide-slate-700">
                    {filteredPackets.map((packet) => (
                      <div key={packet.id} className="p-4 hover:bg-slate-700 transition-colors duration-150">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <span className={`
                              px-2 py-1 text-xs font-medium rounded-full
                              ${getProtocolColor(packet.protocol)}
                            `}>
                              {packet.protocol.toUpperCase()}
                            </span>
                            <div className="text-sm">
                              <span className="font-medium text-slate-100">{packet.source}</span>
                              <span className="text-slate-400 mx-2">→</span>
                              <span className="font-medium text-slate-100">{packet.dest}</span>
                              <span className="text-slate-400 ml-2">:{packet.port}</span>
                            </div>
                          </div>
                          <div className="text-xs text-slate-400">
                            {packet.time}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <div className="text-slate-400 mb-2">
                      <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <p className="text-slate-300">沒有符合過濾條件的資料封包</p>
                    <p className="text-sm text-slate-400 mt-1">請調整通訊協定過濾器設定</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProtocolFilterTest