/**
 * PacketParticleSystem - 封包粒子動畫系統
 *
 * 負責管理單一連線的封包粒子動畫，包括：
 * - 時間軸播放控制（循環播放）
 * - 粒子位置計算
 * - 速度控制
 * - 錯誤封包標記
 * - 粒子生命週期動畫 (spawn → transfer → arrive)
 */

// 粒子生命週期階段定義
export const PARTICLE_PHASES = {
  SPAWN: 'spawn',      // 生成階段：粒子從源點彈出
  TRANSFER: 'transfer', // 傳輸階段：粒子沿路徑移動
  ARRIVE: 'arrive'     // 到達階段：粒子被目的地吸收
}

// 生命週期階段配置（使用位置比例）
const PHASE_CONFIG = {
  spawnEnd: 0.12,     // 生成階段結束位置
  arriveStart: 0.88,  // 到達階段開始位置
}

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
    } else {
      this.connectionSource = null
      this.connectionDest = null
    }
  }

  /**
   * 初始化時間軸 - 計算總時長和歸一化時間戳（等比例拉長版）
   *
   * 實現策略：
   * 1. 保留真實封包的相對時間比例
   * 2. 將整個時間軸拉長到可觀察的長度（至少 20 秒）
   * 3. 確保所有封包都有足夠的顯示時間
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

    // 真實時間跨度（秒）
    const realDurationSeconds = maxTime - minTime

    // 如果所有封包時間戳相同，使用等間隔模式
    if (realDurationSeconds === 0) {
      // 動態最小時長：每個封包 0.5s，整體至少 3s
      const minDurationSec = Math.max(3.0, this.packets.length * 0.5)
      this.duration = minDurationSec * 1000
      const travelTime = minDurationSec * 0.04

      // 等間隔分布，除以 length（保留末端空間給 tail buffer）
      this.packets.forEach((packet, index) => {
        packet._normalizedTime = this.packets.length > 1
          ? index / this.packets.length
          : 0
        packet._travelTime = travelTime
      })
      return
    }

    // === 關鍵：等比例拉長時間軸 ===
    // 動態最小時長：每個封包 0.5s，整體至少 3s（保留真實比例差異）
    const MIN_DURATION_SECONDS = Math.max(3.0, this.packets.length * 0.5)
    const stretchFactor = Math.max(1, MIN_DURATION_SECONDS / realDurationSeconds)
    const stretchedDurationSeconds = realDurationSeconds * stretchFactor

    // 第一遍：計算每個封包的傳輸時間（_travelTime）
    this.packets.forEach((packet, index) => {
      const nextPacket = this.packets[index + 1]
      const realIntervalSeconds = nextPacket
        ? nextPacket.timestamp - packet.timestamp
        : realDurationSeconds * 0.1 // 最後一個封包使用總時長的 10%

      const stretchedIntervalSeconds = realIntervalSeconds * stretchFactor

      // 傳輸時間上限為間距的 70%（確保因果順序：A 結束前 B 不會出現）
      // 相對下限為總時長的 4%（確保動畫可見）；絕對上限 3s
      const travelTime = Math.max(
        stretchedDurationSeconds * 0.04,
        Math.min(stretchedIntervalSeconds * 0.70, 3.0)
      )
      packet._travelTime = travelTime
    })

    // 加入 tail buffer：最後封包需要展示空間（超出 stretchedDuration 的部分）
    const lastTravelTime = this.packets[this.packets.length - 1]._travelTime
    const totalSeconds = stretchedDurationSeconds + lastTravelTime * 1.05

    // 壓縮 _normalizedTime 到 [0, normScale]，確保最後封包的顯示窗口在 1.0 前完整結束
    // normScale = stretchedDuration / totalSeconds，使最後封包的 normalizedTime < 1.0
    const normScale = stretchedDurationSeconds / totalSeconds
    this.packets.forEach((packet) => {
      packet._normalizedTime = normScale * (packet.timestamp - this.startTimestamp) / realDurationSeconds
    })

    this.duration = totalSeconds * 1000
    this.realDurationSeconds = realDurationSeconds // 供 UI 顯示實際捕獲時長
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

    // 直接將全局進度映射到本連線的時間（clamp 防止浮點誤差越界）
    this.currentTime = Math.max(0, Math.min(this.duration, globalProgress * this.duration))
  }

  /**
   * 獲取當前時間對應的絕對時間戳（秒）
   */
  getCurrentTimestamp() {
    return this.startTimestamp + (this.currentTime / 1000)
  }

  /**
   * 計算粒子生命週期狀態
   * @param {number} position - 粒子在路徑上的位置 (0-1)
   * @returns {Object} - 包含 phase, scale, opacity, phaseProgress
   */
  _calculateLifecycleState(position) {
    const { spawnEnd, arriveStart } = PHASE_CONFIG

    if (position <= spawnEnd) {
      // 生成階段：彈出動畫
      const phaseProgress = position / spawnEnd
      // 使用 easeOutBack 緩動函數產生彈出效果
      const overshoot = 1.4
      const t = phaseProgress - 1
      const scale = 1 + t * t * ((overshoot + 1) * t + overshoot)

      return {
        phase: PARTICLE_PHASES.SPAWN,
        scale: Math.max(0, Math.min(1.3, scale)), // 最大放大 1.3 倍產生彈性效果
        opacity: Math.min(1, phaseProgress * 2), // 快速淡入
        phaseProgress,
        glowIntensity: 1 - phaseProgress // 生成時有光暈
      }
    } else if (position >= arriveStart) {
      // 到達階段：吸收動畫
      const phaseProgress = (position - arriveStart) / (1 - arriveStart)
      // 使用 easeInQuad 緩動函數產生加速吸入效果
      const easedProgress = phaseProgress * phaseProgress
      const scale = 1 - easedProgress * 0.9 // 縮小到 0.1

      return {
        phase: PARTICLE_PHASES.ARRIVE,
        scale: Math.max(0.1, scale),
        opacity: 1 - easedProgress * 0.8, // 逐漸淡出
        phaseProgress,
        glowIntensity: phaseProgress // 到達時閃爍
      }
    } else {
      // 傳輸階段：正常顯示
      const phaseProgress = (position - spawnEnd) / (arriveStart - spawnEnd)

      return {
        phase: PARTICLE_PHASES.TRANSFER,
        scale: 1,
        opacity: 1,
        phaseProgress,
        glowIntensity: 0
      }
    }
  }

  /**
   * 提取 TCP flags 字串
   * @param {Object} packet - 封包資料
   * @returns {string|null} - TCP flags 字串
   */
  _extractTcpFlags(packet) {
    if (!packet.headers?.tcp?.flags) return null
    return String(packet.headers.tcp.flags)
  }

  /**
   * 獲取當前應顯示的粒子
   * 返回每個粒子的位置、大小、顏色、生命週期等資訊
   */
  getActiveParticles() {
    if (this.packets.length === 0 || this.duration === 0) {
      return []
    }

    const progress = this.currentTime / this.duration
    const particles = []
    const totalDurationSeconds = this.duration / 1000

    // 只顯示當前時間範圍內的封包
    this.packets.forEach((packet, index) => {
      const packetProgress = packet._normalizedTime

      // 使用封包的拉長後傳輸時間（已在 _initializeTimeline 中計算）
      const packetTravelTime = packet._travelTime || 0.5 // 秒

      // displayDuration：粒子在時間軸上的可見區間（歸一化 0-1）
      // 由於時間軸已經等比例拉長，直接使用拉長後的傳輸時間計算
      // 不再需要固定的 25% 最小值，因為拉長後的傳輸時間已經足夠大
      const calculatedDuration = totalDurationSeconds > 0
        ? packetTravelTime / totalDurationSeconds
        : 0.05 // 備用值

      // 範圍 [0.05, 0.999)：下限避免粒子消失，上限確保不超過一個循環週期
      // 上限是 wrap-around 條件正確性的必要不變量：displayDuration >= 1.0 會造成顯示空隙
      const displayDuration = Math.max(0.05, Math.min(calculatedDuration, 0.999))

      // 判斷封包方向
      let isForward = true // 預設為前向
      if (this.connectionSource && packet.fiveTuple) {
        const [connSrcIp, connSrcPort] = this.connectionSource.split(':')
        if (connSrcPort === '0') {
          // Flood 攻擊使用虛擬端口 0：只比較 IP 地址
          // 因為每個封包的來源端口都不同
          isForward = (packet.fiveTuple.srcIp === connSrcIp)
        } else {
          // 正常連線：比較完整的 IP:Port
          const packetSource = `${packet.fiveTuple.srcIp}:${packet.fiveTuple.srcPort}`
          isForward = (packetSource === this.connectionSource)
        }
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
            particlePosition = Math.max(0, Math.min(1, travelProgress))
          } else {
            // 反向：從 1 移動到 0
            particlePosition = Math.max(0, Math.min(1, 1.0 - travelProgress))
          }
        } else if (packetProgress + displayDuration > 1.0
                   && progress < (packetProgress + displayDuration - 1.0)) {
          // 跨越邊界的循環補顯：僅當顯示視窗確實跨越 1.0 邊界時才觸發
          // 正確條件：packetProgress + displayDuration > 1.0（視窗跨越邊界）
          //           progress < (packetProgress + displayDuration - 1.0)（在下一輪的補顯範圍內）
          //
          // 舊條件：progress + 1.0 >= packetProgress + displayDuration
          // 等價於：progress >= packetProgress + displayDuration - 1.0（對大多數封包幾乎恆成立）
          // → 導致每個封包在其觸發點之前的全段時間內都觸發 wrap，使封包在一輪內重複出現多次
          shouldShow = true
          const adjustedProgress = progress + 1.0
          const travelProgress = (adjustedProgress - packetProgress) / displayDuration

          if (isForward) {
            particlePosition = Math.max(0, Math.min(1, travelProgress))
          } else {
            particlePosition = Math.max(0, Math.min(1, 1.0 - travelProgress))
          }
        }
      } else {
        // 非循環模式：只在封包時間點附近顯示
        if (progress >= packetProgress && progress < packetProgress + displayDuration) {
          shouldShow = true
          const travelProgress = (progress - packetProgress) / displayDuration

          if (isForward) {
            particlePosition = Math.max(0, Math.min(1, travelProgress))
          } else {
            particlePosition = Math.max(0, Math.min(1, 1.0 - travelProgress))
          }
        }
      }

      if (shouldShow) {
        // 計算粒子大小（基於封包長度）
        const minSize = 2
        const maxSize = 8
        const baseSize = minSize + (Math.log(packet.length + 1) / Math.log(65536)) * (maxSize - minSize)

        // 計算生命週期狀態
        const lifecycleState = this._calculateLifecycleState(particlePosition)
        const size = baseSize * lifecycleState.scale

        // 計算粒子顏色（基於協議或錯誤狀態）
        let color = '#60a5fa' // 預設藍色
        let glowColor = null

        // 提取 TCP flags
        const tcpFlags = this._extractTcpFlags(packet)

        if (packet.errorType) {
          color = '#ef4444' // 錯誤封包為紅色
          glowColor = '#fee2e2'
        } else if (packet.headers?.tcp) {
          const flagsStr = tcpFlags || ''

          // RFC 793: SYN（client 發起）vs SYN|ACK（server 回應）語意相反，顏色區分
          if (flagsStr.includes('SYN') && flagsStr.includes('ACK')) {
            color = '#14b8a6' // SYN|ACK — 青綠色（server→client，backward）
          } else if (flagsStr.includes('SYN')) {
            color = '#22c55e' // 純 SYN — 綠色（client→server，forward）
          } else if (flagsStr.includes('RST')) {
            color = '#dc2626' // RST — 深紅色（強制中斷，與 FIN 正常關閉區分）
          } else if (flagsStr.includes('FIN')) {
            color = '#f59e0b' // FIN — 橙色（正常四次揮手）
          } else if (flagsStr.includes('URG')) {
            color = '#ef4444' // URG — 紅色（緊急指標，真正異常）
          } else if (flagsStr.includes('PSH')) {
            color = '#a78bfa' // PSH/PSH|ACK — 紫色（正常資料推送，非攻擊）
          }
        } else if (packet.headers?.udp) {
          color = '#a855f7' // UDP 紫色
        }

        // 生成/到達階段增加光暈效果
        if (lifecycleState.glowIntensity > 0) {
          glowColor = color
        }

        // 使用封包的實際索引 (packet.index)，如果沒有則使用陣列索引
        const packetIndex = packet.index ?? index
        particles.push({
          id: `particle-${packetIndex}`,
          index: packetIndex,
          position: Math.min(1, Math.max(0, particlePosition)), // 0-1 範圍
          size,
          baseSize, // 原始大小（未經縮放）
          color,
          glowColor,
          packet,
          isError: !!packet.errorType,
          label: this.options.showLabels ? this._getPacketLabel(packet, index) : null,
          // 生命週期相關屬性
          phase: lifecycleState.phase,
          scale: lifecycleState.scale,
          opacity: lifecycleState.opacity,
          phaseProgress: lifecycleState.phaseProgress,
          glowIntensity: lifecycleState.glowIntensity,
          // TCP 相關屬性
          tcpFlags,
          direction: isForward ? 'forward' : 'backward'
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

    // 封包編號：優先使用封包的實際序號，否則使用索引
    const packetNumber = packet.number ?? packet.seq ?? (index + 1)
    parts.push(`#${packetNumber}`)

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
