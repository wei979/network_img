import React from 'react'
import AnomalyDetection from './components/AnomalyDetection'
import './App.css'

const AnomalyDetectionTest = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">网络异常检测系统</h1>
          <p className="text-gray-600">
            实时监控网络流量，检测 SYN Flood、DNS 隧道、端口扫描等异常行为
          </p>
        </div>

        <AnomalyDetection />

        {/* 系统信息面板 */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-full">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-800">系统状态</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">监控状态:</span>
                <span className="text-green-600 font-medium">正常</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">检测引擎:</span>
                <span className="text-green-600 font-medium">运行中</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">规则版本:</span>
                <span className="text-gray-800 font-medium">v2.1.0</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-green-100 rounded-full">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-800">性能指标</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">处理速度:</span>
                <span className="text-gray-800 font-medium">1.2K pps</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">内存使用:</span>
                <span className="text-gray-800 font-medium">45.2 MB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">CPU 使用:</span>
                <span className="text-gray-800 font-medium">12.5%</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-orange-100 rounded-full">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-800">威胁统计</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">今日检测:</span>
                <span className="text-red-600 font-medium">23 次</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">已阻止:</span>
                <span className="text-green-600 font-medium">18 次</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">误报率:</span>
                <span className="text-gray-800 font-medium">2.1%</span>
              </div>
            </div>
          </div>
        </div>

        {/* 检测规则说明 */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">检测规则说明</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <h4 className="font-medium text-red-600">SYN Flood 检测</h4>
              <p className="text-sm text-gray-600">
                监控短时间内来自同一源地址的大量 SYN 包，当超过设定阈值时触发告警。
                这种攻击会消耗服务器连接资源，导致正常用户无法建立连接。
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-blue-600">DNS 隧道检测</h4>
              <p className="text-sm text-gray-600">
                分析 DNS 查询的频率、大小和模式，检测可能的数据泄露或命令控制通信。
                异常的 DNS 查询模式可能表明恶意软件正在使用 DNS 协议传输数据。
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-orange-600">端口扫描检测</h4>
              <p className="text-sm text-gray-600">
                监控来自单一源地址对多个目标端口的连接尝试，识别网络侦察行为。
                端口扫描通常是攻击的前期准备，用于发现可利用的服务。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AnomalyDetectionTest