/**
 * PacketParticleSystem - 封包粒子動畫系統
 *
 * 負責管理單一連線的封包粒子動畫，包括：
 * - 時間軸播放控制（循環播放）
 * - 粒子位置計算
 * - 速度控制
 * - 錯誤封包標記
 */

export class PacketParticleSystem {
  constructor(packets, connectionPath, options = {}) {
    this.packets = packets || []
    this.connectionPath = connectionPath // SVG path 或 polyline points
    this.options = {
      loop: true, // 循環播放
      speed: 1.0, // 播放速度倍率
      showLabels: true, // 顯示詳細標記
      ...options
    }

    // 時間軸狀態
    this.isPlaying = true
    this.currentTime = 0 // 當前動畫時間（毫秒）
    this.duration = 0 // 總時長
    this.lastUpdateTime = performance.now()

    // 初始化時間軸
    this._initializeTimeline()
  }

  /**
   * 初始化時間軸 - 計算總時長和歸一化時間戳
   */
  _initializeTimeline() {
    if (this.packets.length === 0) {
      this.duration = 0
      return
    }

    // 找出最早和最晚的時間戳
    const timestamps = this.packets.map(p => p.timestamp)
    const minTime = Math.min(...timestamps)
    const maxTime = Math.max(...timestamps)

    this.startTimestamp = minTime
    this.endTimestamp = maxTime
    this.duration = (maxTime - minTime) * 1000 // 轉換為毫秒

    // 如果所有封包時間戳相同，設置一個最小時長
    if (this.duration === 0) {
      this.duration = 1000 // 1 秒
    }

    // 為每個封包計算歸一化時間 (0-1)
    this.packets.forEach(packet => {
      packet._normalizedTime = this.duration > 0
        ? (packet.timestamp - this.startTimestamp) / (this.endTimestamp - this.startTimestamp)
        : 0
    })
  }

  /**
   * 更新動畫幀
   */
  update(deltaTime = null) {
    if (!this.isPlaying) {
      this.lastUpdateTime = performance.now()
      return
    }

    const now = performance.now()
    const dt = deltaTime !== null ? deltaTime : (now - this.lastUpdateTime)
    this.lastUpdateTime = now

    // 根據速度倍率更新當前時間
    this.currentTime += dt * this.options.speed

    // 循環播放
    if (this.options.loop && this.duration > 0) {
      while (this.currentTime >= this.duration) {
        this.currentTime -= this.duration
      }
      while (this.currentTime < 0) {
        this.currentTime += this.duration
      }
    } else {
      // 非循環模式：限制在 [0, duration] 範圍內
      this.currentTime = Math.max(0, Math.min(this.currentTime, this.duration))
    }
  }

  /**
   * 獲取當前應顯示的粒子
   * 返回每個粒子的位置、大小、顏色等資訊
   */
  getActiveParticles() {
    if (this.packets.length === 0 || this.duration === 0) {
      console.log('[PacketParticleSystem] No packets or zero duration')
      return []
    }

    const progress = this.currentTime / this.duration
    const particles = []

    // 簡化版本：顯示所有封包，根據進度計算位置
    this.packets.forEach((packet, index) => {
      const packetProgress = packet._normalizedTime

      // 計算粒子位置（循環播放）
      let particlePosition = packetProgress

      // 簡化邏輯：如果當前進度已過封包時間點，粒子向前移動一段距離
      if (progress > packetProgress) {
        const offset = (progress - packetProgress) * 0.2 // 粒子會稍微向前移動
        particlePosition = packetProgress + offset
        // 如果超過 1.0，循環回到起點
        if (particlePosition > 1.0) {
          particlePosition = particlePosition - 1.0
        }
      }

      const shouldShow = true // 簡化版本：始終顯示所有粒子

      if (shouldShow) {
        // 計算粒子大小（基於封包長度）
        const minSize = 2
        const maxSize = 8
        const size = minSize + (Math.log(packet.length + 1) / Math.log(65536)) * (maxSize - minSize)

        // 計算粒子顏色（基於協議或錯誤狀態）
        let color = '#60a5fa' // 預設藍色
        let glowColor = null

        if (packet.errorType) {
          color = '#ef4444' // 錯誤封包為紅色
          glowColor = '#fee2e2'
        } else if (packet.headers?.tcp) {
          const flags = packet.headers.tcp.flags || ''
          const flagsStr = Array.isArray(flags) ? flags.join('|') : String(flags)

          if (flagsStr.includes('SYN')) {
            color = '#22c55e' // SYN 綠色
          } else if (flagsStr.includes('FIN') || flagsStr.includes('RST')) {
            color = '#f59e0b' // FIN/RST 橙色
          }
        } else if (packet.headers?.udp) {
          color = '#a855f7' // UDP 紫色
        }

        particles.push({
          id: `particle-${index}`,
          index,
          position: Math.min(1, Math.max(0, particlePosition)), // 0-1 範圍
          size,
          color,
          glowColor,
          packet,
          isError: !!packet.errorType,
          label: this.options.showLabels ? this._getPacketLabel(packet, index) : null
        })
      }
    })

    return particles
  }

  /**
   * 生成封包標籤
   */
  _getPacketLabel(packet, index) {
    const parts = []

    // 封包編號
    parts.push(`#${index}`)

    // 協議類型
    if (packet.headers?.tcp) {
      const flags = packet.headers.tcp.flags
      if (flags) {
        // flags 可能是字串或陣列
        const flagsStr = Array.isArray(flags) ? flags.join('|') : flags
        parts.push(flagsStr)
      } else {
        parts.push('TCP')
      }
    } else if (packet.headers?.udp) {
      parts.push('UDP')
    } else if (packet.headers?.icmp) {
      parts.push('ICMP')
    }

    // HTTP 資訊
    if (packet.http) {
      if (packet.http.type === 'request') {
        parts.push(`${packet.http.method} ${packet.http.path}`)
      } else {
        parts.push(`${packet.http.status}`)
      }
    }

    // 封包大小
    if (packet.length > 1024) {
      parts.push(`${(packet.length / 1024).toFixed(1)}KB`)
    } else {
      parts.push(`${packet.length}B`)
    }

    return parts.join(' ')
  }

  /**
   * 播放控制
   */
  play() {
    this.isPlaying = true
    this.lastUpdateTime = performance.now()
  }

  pause() {
    this.isPlaying = false
  }

  togglePlayPause() {
    if (this.isPlaying) {
      this.pause()
    } else {
      this.play()
    }
  }

  /**
   * 速度控制
   */
  setSpeed(speed) {
    this.options.speed = Math.max(0.1, Math.min(10, speed))
  }

  getSpeed() {
    return this.options.speed
  }

  /**
   * 時間軸跳轉
   */
  seekToTime(time) {
    this.currentTime = Math.max(0, Math.min(time, this.duration))
  }

  seekToProgress(progress) {
    this.currentTime = progress * this.duration
  }

  /**
   * 單步控制
   */
  stepForward() {
    if (this.packets.length === 0) return

    // 找到下一個封包
    const currentProgress = this.currentTime / this.duration
    const nextPacket = this.packets.find(p => p._normalizedTime > currentProgress)

    if (nextPacket) {
      this.currentTime = nextPacket._normalizedTime * this.duration
    } else if (this.options.loop) {
      // 循環模式：跳到第一個封包
      this.currentTime = this.packets[0]._normalizedTime * this.duration
    }
  }

  stepBackward() {
    if (this.packets.length === 0) return

    // 找到上一個封包
    const currentProgress = this.currentTime / this.duration
    const prevPackets = this.packets.filter(p => p._normalizedTime < currentProgress)

    if (prevPackets.length > 0) {
      const prevPacket = prevPackets[prevPackets.length - 1]
      this.currentTime = prevPacket._normalizedTime * this.duration
    } else if (this.options.loop) {
      // 循環模式：跳到最後一個封包
      this.currentTime = this.packets[this.packets.length - 1]._normalizedTime * this.duration
    }
  }

  /**
   * 獲取當前進度
   */
  getProgress() {
    return this.duration > 0 ? this.currentTime / this.duration : 0
  }

  /**
   * 獲取格式化的時間資訊
   */
  getTimeInfo() {
    const current = this.currentTime / 1000
    const total = this.duration / 1000

    return {
      current: current.toFixed(2),
      total: total.toFixed(2),
      progress: this.getProgress(),
      isPlaying: this.isPlaying,
      speed: this.options.speed
    }
  }

  /**
   * 重置動畫
   */
  reset() {
    this.currentTime = 0
    this.lastUpdateTime = performance.now()
  }

  /**
   * 銷毀粒子系統
   */
  destroy() {
    this.packets = []
    this.isPlaying = false
  }
}

export default PacketParticleSystem
