/**
 * FloodParticleSystem - 攻擊流量洪流粒子效果
 *
 * 專為 SYN Flood 等大量連線攻擊設計的視覺化效果
 * - 粒子密度 = 封包率（越多封包，粒子越密集）
 * - 粒子顏色 = SYN (紅/橙) / ACK (綠) / RST (藍)
 * - 類似「洪水」或「雨點」的視覺效果
 */

import { useEffect, useRef, useState, useCallback } from 'react'

// 粒子顏色配置
const PARTICLE_COLORS = {
  SYN: '#ef4444',      // 紅色 - SYN 封包
  SYN_ACK: '#f97316',  // 橙色 - SYN-ACK
  ACK: '#22c55e',      // 綠色 - ACK
  RST: '#3b82f6',      // 藍色 - RST
  FIN: '#a855f7',      // 紫色 - FIN
  DEFAULT: '#94a3b8'   // 灰色 - 其他
}

// 粒子配置
const CONFIG = {
  // 基礎粒子數量（低流量）
  MIN_PARTICLES: 50,
  // 最大粒子數量（高流量，防止卡頓）
  MAX_PARTICLES: 500,
  // 粒子速度範圍（每秒移動的路徑比例）
  MIN_SPEED: 0.3,
  MAX_SPEED: 1.2,
  // 粒子大小範圍
  MIN_SIZE: 1.5,
  MAX_SIZE: 4,
  // 粒子拖尾長度
  TRAIL_LENGTH: 3,
  // 更新間隔（毫秒）
  UPDATE_INTERVAL: 16, // ~60fps
  // 粒子生成間隔基數（毫秒）
  SPAWN_INTERVAL_BASE: 30, // 更快的生成速度
  // 爆發效果配置
  BURST_THRESHOLD: 0.7, // 封包率超過 70% 峰值時觸發爆發
  BURST_PARTICLE_COUNT: 30, // 每次爆發生成的粒子數
  BURST_COOLDOWN: 200 // 爆發冷卻時間（毫秒）
}

/**
 * 單個粒子類
 */
class Particle {
  constructor(config) {
    this.id = Math.random().toString(36).substr(2, 9)
    this.progress = 0 // 沿路徑的進度 (0-1)
    this.speed = config.speed || (CONFIG.MIN_SPEED + Math.random() * (CONFIG.MAX_SPEED - CONFIG.MIN_SPEED))
    this.size = config.size || (CONFIG.MIN_SIZE + Math.random() * (CONFIG.MAX_SIZE - CONFIG.MIN_SIZE))
    this.color = config.color || PARTICLE_COLORS.DEFAULT
    this.type = config.type || 'DEFAULT'
    this.opacity = 0.8 + Math.random() * 0.2
    this.trail = [] // 拖尾位置
    this.isReverse = config.isReverse || false // 反向（回程封包）
  }

  update(deltaTime) {
    // 更新拖尾
    if (this.trail.length >= CONFIG.TRAIL_LENGTH) {
      this.trail.shift()
    }
    this.trail.push(this.progress)

    // 更新進度
    const progressDelta = this.speed * (deltaTime / 1000)
    if (this.isReverse) {
      this.progress -= progressDelta
    } else {
      this.progress += progressDelta
    }

    // 檢查是否完成
    return this.isReverse ? this.progress > 0 : this.progress < 1
  }
}

/**
 * FloodParticleSystem 元件
 */
export default function FloodParticleSystem({
  // 路徑資訊
  fromPoint,    // { x, y } 起點
  toPoint,      // { x, y } 終點
  // 統計資訊（來自 AttackTimelineChart）
  statistics,   // { timeline, summary }
  // 是否播放
  isPlaying = true,
  // 當前時間進度 (0-1)，用於同步心電圖
  timeProgress = 0,
  // 強度變化回調 (0-1)
  onIntensityChange = null,
  // 樣式
  className = ''
}) {
  const particlesRef = useRef([])
  const lastUpdateRef = useRef(performance.now())
  const animationFrameRef = useRef(null)
  const spawnTimerRef = useRef(0)
  const burstCooldownRef = useRef(0) // 爆發冷卻計時器
  const lastIntensityRef = useRef(0) // 追蹤上一幀的強度
  const [, forceUpdate] = useState(0)

  // 計算路徑向量
  const pathVector = {
    dx: toPoint.x - fromPoint.x,
    dy: toPoint.y - fromPoint.y,
    length: Math.hypot(toPoint.x - fromPoint.x, toPoint.y - fromPoint.y)
  }

  // 根據統計資料計算當前封包率
  const getCurrentPacketRate = useCallback(() => {
    if (!statistics?.timeline || statistics.timeline.length === 0) {
      return { total: 100, syn: 50, ack: 30, rst: 20 }
    }

    // 根據 timeProgress 找到對應的時間桶
    const bucketIndex = Math.floor(timeProgress * statistics.timeline.length)
    const bucket = statistics.timeline[Math.min(bucketIndex, statistics.timeline.length - 1)]

    return {
      total: bucket?.packet_count || 0,
      syn: bucket?.syn_count || 0,
      ack: bucket?.ack_count || 0,
      rst: bucket?.rst_count || 0
    }
  }, [statistics, timeProgress])

  // 根據封包率計算應該顯示的粒子數量
  const getTargetParticleCount = useCallback(() => {
    const rate = getCurrentPacketRate()
    const summary = statistics?.summary || {}

    // 根據峰值速率歸一化
    const peakRate = summary.peak_rate || 1000
    const normalizedRate = rate.total / peakRate

    // 映射到粒子數量範圍
    const targetCount = Math.floor(
      CONFIG.MIN_PARTICLES + normalizedRate * (CONFIG.MAX_PARTICLES - CONFIG.MIN_PARTICLES)
    )

    return Math.min(targetCount, CONFIG.MAX_PARTICLES)
  }, [getCurrentPacketRate, statistics])

  // 計算當前攻擊強度 (0-1)
  const getCurrentIntensity = useCallback(() => {
    const rate = getCurrentPacketRate()
    const summary = statistics?.summary || {}
    const peakRate = summary.peak_rate || 1000
    return Math.min(rate.total / peakRate, 1)
  }, [getCurrentPacketRate, statistics])

  // 爆發生成粒子
  const spawnBurstParticles = useCallback(() => {
    const rate = getCurrentPacketRate()
    const newParticles = []

    for (let i = 0; i < CONFIG.BURST_PARTICLE_COUNT; i++) {
      // 爆發時主要生成 SYN 粒子（紅色）
      const type = Math.random() < 0.8 ? 'SYN' : 'SYN_ACK'
      const color = type === 'SYN' ? PARTICLE_COLORS.SYN : PARTICLE_COLORS.SYN_ACK

      newParticles.push(new Particle({
        type,
        color,
        isReverse: false,
        // 爆發粒子速度更快
        speed: (CONFIG.MIN_SPEED + Math.random() * (CONFIG.MAX_SPEED - CONFIG.MIN_SPEED)) * 1.5,
        // 爆發粒子稍大
        size: CONFIG.MIN_SIZE + Math.random() * (CONFIG.MAX_SIZE - CONFIG.MIN_SIZE) * 1.3
      }))
    }

    return newParticles
  }, [getCurrentPacketRate])

  // 生成新粒子
  const spawnParticle = useCallback(() => {
    const rate = getCurrentPacketRate()
    const total = rate.syn + rate.ack + rate.rst + 1 // +1 避免除零

    // 根據比例隨機選擇粒子類型
    const rand = Math.random() * total
    let type, color, isReverse

    if (rand < rate.syn) {
      type = 'SYN'
      color = PARTICLE_COLORS.SYN
      isReverse = false
    } else if (rand < rate.syn + rate.ack) {
      type = 'ACK'
      color = PARTICLE_COLORS.ACK
      isReverse = Math.random() > 0.5 // ACK 可能是雙向的
    } else if (rand < rate.syn + rate.ack + rate.rst) {
      type = 'RST'
      color = PARTICLE_COLORS.RST
      isReverse = true // RST 通常是回應
    } else {
      type = 'DEFAULT'
      color = PARTICLE_COLORS.DEFAULT
      isReverse = Math.random() > 0.7
    }

    // 添加速度變化（SYN Flood 通常很快）
    const speedMultiplier = type === 'SYN' ? 1.2 : type === 'RST' ? 0.8 : 1.0

    return new Particle({
      type,
      color,
      isReverse,
      speed: (CONFIG.MIN_SPEED + Math.random() * (CONFIG.MAX_SPEED - CONFIG.MIN_SPEED)) * speedMultiplier,
      size: CONFIG.MIN_SIZE + Math.random() * (CONFIG.MAX_SIZE - CONFIG.MIN_SIZE)
    })
  }, [getCurrentPacketRate])

  // 動畫循環
  useEffect(() => {
    if (!isPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      return
    }

    const animate = () => {
      const now = performance.now()
      const deltaTime = now - lastUpdateRef.current
      lastUpdateRef.current = now

      // 更新現有粒子
      particlesRef.current = particlesRef.current.filter(particle => particle.update(deltaTime))

      // 根據封包率生成新粒子
      const targetCount = getTargetParticleCount()
      const currentCount = particlesRef.current.length

      // 計算當前強度
      const currentIntensity = getCurrentIntensity()

      // 爆發效果：當強度超過閾值且強度在上升時觸發
      burstCooldownRef.current = Math.max(0, burstCooldownRef.current - deltaTime)

      if (
        currentIntensity >= CONFIG.BURST_THRESHOLD &&
        currentIntensity > lastIntensityRef.current &&
        burstCooldownRef.current <= 0
      ) {
        // 觸發爆發！
        const burstParticles = spawnBurstParticles()
        particlesRef.current.push(...burstParticles)
        burstCooldownRef.current = CONFIG.BURST_COOLDOWN
        console.log(`[FloodParticleSystem] Burst triggered! Intensity: ${(currentIntensity * 100).toFixed(1)}%`)
      }

      lastIntensityRef.current = currentIntensity

      // 通知父組件當前強度
      if (onIntensityChange) {
        onIntensityChange(currentIntensity)
      }

      // 動態調整生成速率
      spawnTimerRef.current += deltaTime
      const spawnInterval = CONFIG.SPAWN_INTERVAL_BASE * (CONFIG.MAX_PARTICLES / Math.max(targetCount, 1))

      if (spawnTimerRef.current >= spawnInterval && currentCount < targetCount) {
        particlesRef.current.push(spawnParticle())
        spawnTimerRef.current = 0
      }

      // 強制重新渲染
      forceUpdate(n => n + 1)

      animationFrameRef.current = requestAnimationFrame(animate)
    }

    animationFrameRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isPlaying, getTargetParticleCount, getCurrentIntensity, spawnParticle, spawnBurstParticles])

  // 計算粒子在路徑上的位置
  const getParticlePosition = (progress) => {
    return {
      x: fromPoint.x + pathVector.dx * progress,
      y: fromPoint.y + pathVector.dy * progress
    }
  }

  // 渲染
  return (
    <g className={`flood-particle-system ${className}`}>
      {/* 發光濾鏡 */}
      <defs>
        <filter id="particleGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      {/* 渲染所有粒子 */}
      {particlesRef.current.map(particle => {
        const pos = getParticlePosition(particle.progress)

        // 確保位置有效
        if (!isFinite(pos.x) || !isFinite(pos.y)) return null
        if (particle.progress < 0 || particle.progress > 1) return null

        return (
          <g key={particle.id}>
            {/* 拖尾效果 */}
            {particle.trail.map((trailProgress, i) => {
              const trailPos = getParticlePosition(trailProgress)
              if (!isFinite(trailPos.x) || !isFinite(trailPos.y)) return null
              if (trailProgress < 0 || trailProgress > 1) return null

              const trailOpacity = (i / CONFIG.TRAIL_LENGTH) * 0.3
              const trailSize = particle.size * (0.3 + (i / CONFIG.TRAIL_LENGTH) * 0.5)

              return (
                <circle
                  key={`trail-${i}`}
                  cx={trailPos.x}
                  cy={trailPos.y}
                  r={trailSize}
                  fill={particle.color}
                  opacity={trailOpacity}
                />
              )
            })}

            {/* 主粒子 */}
            <circle
              cx={pos.x}
              cy={pos.y}
              r={particle.size}
              fill={particle.color}
              opacity={particle.opacity}
              filter="url(#particleGlow)"
            />
          </g>
        )
      })}

      {/* 顯示統計資訊（調試用，可移除） */}
      {false && statistics?.summary && (
        <text
          x={fromPoint.x}
          y={fromPoint.y - 20}
          fill="#fff"
          fontSize="10"
          textAnchor="middle"
        >
          {`${particlesRef.current.length} particles | ${statistics.summary.attack_type}`}
        </text>
      )}
    </g>
  )
}
