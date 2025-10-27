import React from 'react'
import TimeoutDemo from './components/TimeoutDemo'
import './App.css'

const TimeoutTest = () => {
  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-100 mb-4">
            連線超時視覺化測試
          </h1>
          <p className="text-slate-400 text-lg">
            測試不同協議的連線超時情況，包含視覺效果和警告提示
          </p>
        </div>
        
        <TimeoutDemo />
      </div>
    </div>
  )
}

export default TimeoutTest