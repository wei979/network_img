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
    console.log('协议过滤器状态更新:', newFilters)
  }

  // 模拟网络数据包
  const mockPackets = [
    { id: 1, protocol: 'tcp', source: '192.168.1.100', dest: '192.168.1.1', port: 80, time: '10:30:15' },
    { id: 2, protocol: 'udp', source: '192.168.1.100', dest: '8.8.8.8', port: 53, time: '10:30:16' },
    { id: 3, protocol: 'http', source: '192.168.1.100', dest: '203.208.60.1', port: 443, time: '10:30:17' },
    { id: 4, protocol: 'dns', source: '192.168.1.100', dest: '8.8.8.8', port: 53, time: '10:30:18' },
    { id: 5, protocol: 'tcp', source: '192.168.1.100', dest: '192.168.1.1', port: 22, time: '10:30:19' },
    { id: 6, protocol: 'udp', source: '192.168.1.100', dest: '192.168.1.255', port: 137, time: '10:30:20' }
  ]

  // 根据过滤器筛选数据包
  const filteredPackets = mockPackets.filter(packet => filters[packet.protocol])

  const getProtocolColor = (protocol) => {
    const colors = {
      tcp: 'text-blue-600 bg-blue-50',
      udp: 'text-green-600 bg-green-50',
      http: 'text-purple-600 bg-purple-50',
      dns: 'text-orange-600 bg-orange-50'
    }
    return colors[protocol] || 'text-gray-600 bg-gray-50'
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">协议过滤器测试</h1>
          <p className="text-gray-600">
            测试网络协议过滤功能，可以选择性显示不同类型的网络流量
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 协议过滤器 */}
          <div className="lg:col-span-1">
            <ProtocolFilter 
              filters={filters}
              onFilterChange={handleFilterChange}
            />
            
            {/* 过滤统计 */}
            <div className="mt-4 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h4 className="font-semibold text-gray-800 mb-3">过滤统计</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">总数据包:</span>
                  <span className="font-medium">{mockPackets.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">已过滤:</span>
                  <span className="font-medium text-green-600">{filteredPackets.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">已隐藏:</span>
                  <span className="font-medium text-red-600">{mockPackets.length - filteredPackets.length}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 数据包列表 */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800">网络数据包</h3>
                <p className="text-sm text-gray-600 mt-1">
                  显示 {filteredPackets.length} 个数据包 (共 {mockPackets.length} 个)
                </p>
              </div>
              
              <div className="overflow-hidden">
                {filteredPackets.length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {filteredPackets.map((packet) => (
                      <div key={packet.id} className="p-4 hover:bg-gray-50 transition-colors duration-150">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <span className={`
                              px-2 py-1 text-xs font-medium rounded-full
                              ${getProtocolColor(packet.protocol)}
                            `}>
                              {packet.protocol.toUpperCase()}
                            </span>
                            <div className="text-sm">
                              <span className="font-medium text-gray-800">{packet.source}</span>
                              <span className="text-gray-400 mx-2">→</span>
                              <span className="font-medium text-gray-800">{packet.dest}</span>
                              <span className="text-gray-500 ml-2">:{packet.port}</span>
                            </div>
                          </div>
                          <div className="text-xs text-gray-500">
                            {packet.time}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <div className="text-gray-400 mb-2">
                      <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <p className="text-gray-500">没有符合过滤条件的数据包</p>
                    <p className="text-sm text-gray-400 mt-1">请调整协议过滤器设置</p>
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