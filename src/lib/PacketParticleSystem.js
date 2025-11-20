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
      connectionId: null, // 連線 ID (用於判斷封包方向)
      ...options
    }

    // 時間軸狀態
    this.isPlaying = true
    this.currentTime = 0 // 當前動畫時間（毫秒）
    this.duration = 0 // 總時長
    this.lastUpdateTime = performance.now()

    // 解析連線 ID 以取得連線的起點和終點
    this._parseConnectionEndpoints()

    // 初始化時間軸
    this._initializeTimeline()
  }

  /**
   * 解析連線 ID 來取得連線的起點和終點
   * 連線 ID 格式：protocol-srcIp-srcPort-dstIp-dstPort
   */
  _parseConnectionEndpoints() {
    if (!this.options.connectionId) {
      this.connectionSource = null
      this.connectionDest = null
      return
    }

    const parts = this.options.connectionId.split('-')
    if (parts.length >= 5) {
      // 格式：protocol-srcIp-srcPort-dstIp-dstPort
      const protocol = parts[0]
      const srcIp = parts[1]
      const srcPort = parts[2]
      const dstIp = parts[3]
      const dstPort = parts[4]

      this.connectionSource = `${srcIp}:${srcPort}`
      this.connectionDest = `${dstIp}:${dstPort}`

      console.log('[PacketParticleSystem] Connection endpoints:', {
        connectionId: this.options.connectionId,
        source: this.connectionSource,
        dest: this.connectionDest
      })
    } else {
      this.connectionSource = null
      this.connectionDest = null
    }
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

    // 為每個封包計算歸一化時間 (0-1) 和動態傳輸時間
    this.packets.forEach((packet, index) => {
      packet._normalizedTime = this.duration > 0
        ? (packet.timestamp - this.startTimestamp) / (this.endTimestamp - this.startTimestamp)
        : 0

      // 計算到下一個封包的時間間隔（秒）
      const nextPacket = this.packets[index + 1]
      const timeToNext = nextPacket
        ? nextPacket.timestamp - packet.timestamp
        : 0.5 // 最後一個封包使用預設值

      // 使用間隔的 50% 作為傳輸時間，並限制在合理範圍內
      // 最小 100ms，最大 1000ms
      const travelTime = Math.max(0.1, Math.min(timeToNext * 0.5, 1.0))
      packet._travelTime = travelTime // 儲存每個封包的傳輸時間（秒）
    })

    // 調試日誌
    if (this.packets.length > 0) {
      const travelTimes = this.packets.map(p => (p._travelTime * 1000).toFixed(0))
      console.log('[PacketParticleSystem] Dynamic travel times (ms):', {
        min: Math.min(...travelTimes),
        max: Math.max(...travelTimes),
        avg: (travelTimes.reduce((a, b) => a + parseInt(b), 0) / travelTimes.length).toFixed(0),
        samples: travelTimes.slice(0, 10) // 顯示前 10 個
      })
    }
  }

  /**
   * 更新動畫幀（自主模式 - 內部時間管理）
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
   * 設置外部全局時間（同步模式 - 外部時間管理）
   * @param {number} globalTime - 當前全局時間（毫秒）
   * @param {number} globalDuration - 全局總時長（毫秒）
   */
  setGlobalTime(globalTime, globalDuration) {
    // 簡化版本：直接使用全局進度來計算本地時間
    // 不再嘗試映射絕對時間戳，因為全局時間和封包時間可能不在同一時間範圍

    const globalProgress = globalDuration > 0 ? globalTime / globalDuration : 0

    // 直接將全局進度映射到本連線的時間
    this.currentTime = globalProgress * this.duration

    // 調試日誌
    if (Math.random() < 0.05) {
      console.log('[PacketParticleSystem] setGlobalTime:', {
        globalTime: (globalTime / 1000).toFixed(2) + 's',
        globalDuration: (globalDuration / 1000).toFixed(2) + 's',
        globalProgress: (globalProgress * 100).toFixed(1) + '%',
        currentTime: (this.currentTime / 1000).toFixed(2) + 's',
        duration: (this.duration / 1000).toFixed(2) + 's',
        localProgress: ((this.currentTime / this.duration) * 100).toFixed(1) + '%'
      })
    }
  }

  /**
   * 獲取當前時間對應的絕對時間戳（秒）
   */
  getCurrentTimestamp() {
    return this.startTimestamp + (this.currentTime / 1000)
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
    const totalDurationSeconds = this.duration / 1000

    // 調試日誌
    if (Math.random() < 0.05) {
      console.log('[PacketParticleSystem] getActiveParticles:', {
        currentTime: (this.currentTime / 1000).toFixed(2) + 's',
        duration: (this.duration / 1000).toFixed(2) + 's',
        progress: (progress * 100).toFixed(1) + '%',
        packetCount: this.packets.length
      })
    }

    // 只顯示當前時間範圍內的封包
    this.packets.forEach((packet, index) => {
      const packetProgress = packet._normalizedTime

      // 使用封包的動態傳輸時間（基於到下一個封包的間隔）
      const packetTravelTime = packet._travelTime || 0.5 // 秒
      const displayDuration = totalDurationSeconds > 0
        ? packetTravelTime / totalDurationSeconds
        : 0.05

      // 判斷封包方向
      let isForward = true // 預設為前向
      if (this.connectionSource && packet.fiveTuple) {
        const packetSource = `${packet.fiveTuple.srcIp}:${packet.fiveTuple.srcPort}`
        isForward = (packetSource === this.connectionSource)
      }

      // 計算粒子是否應該顯示
      let shouldShow = false
      let particlePosition = packetProgress

      if (this.options.loop) {
        // 循環模式：粒子在到達時間點後開始移動，移動一段距離後消失
        if (progress >= packetProgress && progress < packetProgress + displayDuration) {
          shouldShow = true
          // 粒子從起點移動到終點（完整路徑）
          const travelProgress = (progress - packetProgress) / displayDuration

          if (isForward) {
            // 前向：從 0 移動到 1
            particlePosition = travelProgress
          } else {
            // 反向：從 1 移動到 0
            particlePosition = 1.0 - travelProgress
          }
        } else if (progress < packetProgress && progress + 1.0 >= packetProgress + displayDuration) {
          // 循環播放：如果當前進度在下一輪，且粒子應該顯示
          shouldShow = true
          const adjustedProgress = progress + 1.0
          const travelProgress = (adjustedProgress - packetProgress) / displayDuration

          if (isForward) {
            particlePosition = travelProgress
          } else {
            particlePosition = 1.0 - travelProgress
          }

          // 處理循環邊界
          if (particlePosition > 1.0) {
            particlePosition = particlePosition - 1.0
          }
          if (particlePosition < 0) {
            particlePosition = particlePosition + 1.0
          }
        }
      } else {
        // 非循環模式：只在封包時間點附近顯示
        if (progress >= packetProgress && progress < packetProgress + displayDuration) {
          shouldShow = true
          const travelProgress = (progress - packetProgress) / displayDuration

          if (isForward) {
            particlePosition = travelProgress
          } else {
            particlePosition = 1.0 - travelProgress
          }
        }
      }

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
