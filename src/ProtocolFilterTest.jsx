import React, { useState } from 'react'
import ProtocolFilter from './components/ProtocolFilter'
import { Wifi, Globe, Search, AlertTriangle } from 'lucide-react'

// 模擬網路數據包
const mockPackets = [
  { id: 1, protocol: 'tcp', source: '192.168.1.1', destination: '8.8.8.8', info: 'SYN' },
  { id: 2, protocol: 'udp', source: '192.168.1.2', destination: '1.1.1.1', info: 'DNS Query' },
  { id: 3, protocol: 'http', source: '192.168.1.3', destination: 'example.com', info: 'GET /index.html' },
  { id: 4, protocol: 'dns', source: '192.168.1.4', destination: '8.8.8.8', info: 'DNS Response' },
  { id: 5, protocol: 'tcp', source: '192.168.1.5', destination: '8.8.8.8', info: 'ACK' },
]

function ProtocolFilterTest() {
  const [filters, setFilters] = useState({
    tcp: true,
    udp: true,
    http: true,
    dns: true,
  })

  // 根據過濾器篩選數據包
  const filteredPackets = mockPackets.filter(packet => filters[packet.protocol])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8 text-slate-100">
          協議過濾器測試
        </h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <ProtocolFilter filters={filters} onFilterChange={setFilters} />
          </div>

          <div className="lg:col-span-2 bg-slate-900 rounded-xl border border-slate-800 p-6">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">過濾統計</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-slate-300">
                <span>總數據包:</span>
                <span className="font-semibold">{mockPackets.length}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>過濾後數據包:</span>
                <span className="font-semibold">{filteredPackets.length}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>TCP (啟用):</span>
                <span className={`font-semibold ${filters.tcp ? 'text-blue-400' : 'text-slate-500'}`}>{filters.tcp ? '是' : '否'}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>UDP (啟用):</span>
                <span className={`font-semibold ${filters.udp ? 'text-green-400' : 'text-slate-500'}`}>{filters.udp ? '是' : '否'}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>HTTP (啟用):</span>
                <span className={`font-semibold ${filters.http ? 'text-purple-400' : 'text-slate-500'}`}>{filters.http ? '是' : '否'}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>DNS (啟用):</span>
                <span className={`font-semibold ${filters.dns ? 'text-orange-400' : 'text-slate-500'}`}>{filters.dns ? '是' : '否'}</span>
              </div>
            </div>

            <h3 className="text-lg font-semibold text-slate-100 mt-6 mb-4">網路數據包</h3>
            {filteredPackets.length > 0 ? (
              <div className="space-y-3">
                {filteredPackets.map(packet => (
                  <div key={packet.id} className="bg-slate-800 border border-slate-700 rounded-lg p-3 flex items-center gap-3">
                    {packet.protocol === 'tcp' && <Wifi className="w-5 h-5 text-blue-400" />}
                    {packet.protocol === 'udp' && <Wifi className="w-5 h-5 text-green-400" />} {/* Use a different icon or color for UDP */}
                    {packet.protocol === 'http' && <Globe className="w-5 h-5 text-purple-400" />}
                    {packet.protocol === 'dns' && <Search className="w-5 h-5 text-orange-400" />}
                    <div>
                      <div className="font-medium text-slate-200">{packet.info}</div>
                      <div className="text-xs text-slate-400">{packet.source} → {packet.destination}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-slate-500">
                <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-slate-600" />
                <p>沒有符合過濾條件的數據包</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProtocolFilterTest
