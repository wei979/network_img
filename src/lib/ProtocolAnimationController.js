import { getProtocolState, getProtocolColor } from './ProtocolStates.js'

export class ProtocolAnimationController {
  constructor(timeline, hooks = {}) {
    this.timeline = timeline
    this.hooks = hooks
    this.playbackSpeed = 1
    this.elapsedMs = 0
    this.isCompleted = false
    this.protocolState = null
    
    // 嘗試從協議狀態定義中獲取增強的狀態
    if (timeline?.protocolType) {
      this.protocolState = getProtocolState(timeline.protocolType, timeline.options || {})
    }
    
    this.timelineDuration = Array.isArray(timeline?.stages)
      ? timeline.stages.reduce((sum, stage) => sum + (stage?.durationMs || stage?.duration || 0), 0)
      : (this.protocolState?.totalDuration || 0)
      
    this.state = {
      currentStage: timeline?.stages?.[0] ?? this.protocolState?.stages?.[0] ?? null,
      stageIndex: 0,
      visualEffects: {
        blinking: false,
        spinning: false,
        pulsing: false,
        opacity: 1.0,
        connectionStyle: 'solid'
      }
    }
  }

  get totalDuration() {
    return this.timelineDuration
  }

  reset() {
    this.elapsedMs = 0
    this.isCompleted = false
    this.wasCompleted = false
    
    const stages = this.timeline?.stages || this.protocolState?.stages || []
    this.state = {
      currentStage: stages[0] ?? null,
      stageIndex: 0,
      visualEffects: {
        blinking: false,
        spinning: false,
        pulsing: false,
        opacity: 1.0,
        connectionStyle: 'solid'
      }
    }
    
    if (this.state.currentStage) {
      this.#emitStageEnter(this.state.currentStage)
    }
    return this.state
  }

  advance(deltaMs) {
    const stages = this.timeline?.stages || this.protocolState?.stages || []
    if (!stages.length) {
      return this.state
    }

    this.elapsedMs += deltaMs * this.playbackSpeed
    this.#syncStage()
    return this.state
  }

  seek(targetMs) {
    const maxDuration = this.timelineDuration || (this.timeline?.endEpochMs ?? 0) - (this.timeline?.startEpochMs ?? 0)
    const clampedTarget = Math.max(0, Math.min(targetMs, maxDuration))
    this.elapsedMs = clampedTarget
    this.#syncStage()
    return this.state
  }

  seekToProgress(progress) {
    // 将进度值 (0-1) 转换为时间并跳转
    const targetMs = Math.max(0, Math.min(1, progress)) * this.timelineDuration
    return this.seek(targetMs)
  }

  setPlaybackSpeed(multiplier) {
    this.playbackSpeed = Math.max(0, multiplier)
  }

  getRenderableState() {
    const progress = this.timelineDuration
      ? Math.min(1, this.elapsedMs / this.timelineDuration)
      : 0

    const currentStage = this.state.currentStage
    const stageProgress = this.#getStageProgress()
    
    // 計算動畫圓點位置
    const dotPositionObj = this.#calculateDotPosition(currentStage, stageProgress)
    const dotPosition = dotPositionObj?.x || 0
    
    // 更新視覺效果
    this.#updateVisualEffects(currentStage)

    return {
      currentStage: currentStage,
      stageIndex: this.state.stageIndex,
      timelineProgress: progress,
      stageProgress: stageProgress,
      dotPosition: dotPosition,
      visualEffects: { ...this.state.visualEffects },
      protocolColor: this.#getCurrentColor(),
      connectionStyle: this.#getConnectionStyle(),
      isCompleted: this.isCompleted,
      protocolType: this.timeline?.protocolType || 'unknown'
    }
  }

  #syncStage() {
    const stages = this.timeline?.stages || this.protocolState?.stages || []
    if (!stages.length) {
      return
    }

    const durationTotal = this.timelineDuration
    const clamped = durationTotal ? Math.min(this.elapsedMs, durationTotal) : 0

    let accumulated = 0
    for (let i = 0; i < stages.length; i += 1) {
      const stage = stages[i]
      const stageDuration = stage.durationMs || stage.duration || 0
      accumulated += stageDuration
      
      if (clamped <= accumulated) {
        if (this.state.stageIndex !== i) {
          this.state.stageIndex = i
          this.state.currentStage = stage
          this.#emitStageEnter(stage)
        } else {
          this.state.currentStage = stage
        }
        return
      }
    }

    // 動畫完成
    const lastIndex = stages.length - 1
    this.state.stageIndex = lastIndex
    this.state.currentStage = stages[lastIndex]
    this.isCompleted = true
    
    // 觸發完成事件
    if (this.hooks.onComplete && !this.wasCompleted) {
      this.hooks.onComplete(this.protocolState?.finalState || 'completed')
      this.wasCompleted = true
    }
  }

  #getStageProgress() {
    const stages = this.timeline?.stages || this.protocolState?.stages || []
    if (!stages.length || !this.timelineDuration) {
      return 0
    }

    let accumulated = 0
    for (let i = 0; i < this.state.stageIndex; i += 1) {
      accumulated += stages[i]?.durationMs || stages[i]?.duration || 0
    }

    const currentStage = stages[this.state.stageIndex]
    const currentStageDuration = currentStage?.durationMs || currentStage?.duration || 1
    const stageElapsed = this.elapsedMs - accumulated
    return Math.min(1, Math.max(0, stageElapsed / currentStageDuration))
  }

  #calculateDotPosition(stage, progress) {
    if (!stage) {
      return { x: 0, y: 0 }
    }

    const direction = stage.direction || 'forward'
    
    switch (direction) {
      case 'forward':
        return { x: progress, y: 0 }
      case 'backward':
        return { x: 1 - progress, y: 0 }
      case 'both':
        // 雙向動畫，來回移動
        const cycle = Math.sin(progress * Math.PI * 2) * 0.5 + 0.5
        return { x: cycle, y: 0 }
      case 'wait':
        // 等待狀態，停在中間
        return { x: 0.5, y: 0 }
      case 'none':
        // 無移動
        return { x: 0.5, y: 0 }
      default:
        return { x: progress, y: 0 }
    }
  }

  #updateVisualEffects(stage) {
    if (!stage) return

    // 重置效果
    this.state.visualEffects = {
      blinking: false,
      spinning: false,
      pulsing: false,
      opacity: 1.0,
      connectionStyle: 'solid'
    }

    // 根據階段設置效果
    if (stage.blinking) {
      this.state.visualEffects.blinking = true
    }
    
    if (stage.spinning) {
      this.state.visualEffects.spinning = true
    }
    
    if (stage.pulsing) {
      this.state.visualEffects.pulsing = true
    }
    
    if (stage.opacity !== undefined) {
      this.state.visualEffects.opacity = stage.opacity
    }

    // 設置連線樣式
    if (stage.unreliable) {
      this.state.visualEffects.connectionStyle = 'dashed'
    } else if (stage.encrypted || stage.secure) {
      this.state.visualEffects.connectionStyle = 'encrypted'
    }
  }

  #getCurrentColor() {
    const stage = this.state.currentStage
    if (!stage) {
      return getProtocolColor(this.timeline?.protocol || 'unknown')
    }

    // 如果是超時協議，根據時間漸變顏色
    if (this.protocolState?.description === '連線超時處理') {
      const progress = this.elapsedMs / this.timelineDuration
      const colors = this.protocolState.colorTransition || ['#10b981', '#fbbf24', '#f59e0b', '#ef4444']
      const colorIndex = Math.floor(progress * (colors.length - 1))
      return colors[Math.min(colorIndex, colors.length - 1)]
    }

    return stage.color || getProtocolColor(this.timeline?.protocol || 'unknown')
  }

  #getConnectionStyle() {
    const stage = this.state.currentStage
    if (!stage) return 'solid'

    if (this.protocolState?.connectionStyle) {
      return this.protocolState.connectionStyle
    }

    return this.state.visualEffects.connectionStyle
  }

  #emitStageEnter(stage) {
    if (typeof this.hooks.onStageEnter === 'function') {
      this.hooks.onStageEnter(stage)
    }
  }

  // 靜態方法：創建特定協議類型的動畫控制器
  static createTcpHandshake(connectionId, hooks = {}) {
    const timeline = {
      id: connectionId,
      protocolType: 'tcp-handshake',
      protocol: 'tcp'
    }
    return new ProtocolAnimationController(timeline, hooks)
  }

  static createTcpTeardown(connectionId, hooks = {}) {
    const timeline = {
      id: connectionId,
      protocolType: 'tcp-teardown',
      protocol: 'tcp'
    }
    return new ProtocolAnimationController(timeline, hooks)
  }

  static createHttpRequest(connectionId, statusCode = 200, hooks = {}) {
    const timeline = {
      id: connectionId,
      protocolType: 'http-request',
      protocol: 'http',
      options: { statusCode }
    }
    return new ProtocolAnimationController(timeline, hooks)
  }

  static createHttpsRequest(connectionId, statusCode = 200, hooks = {}) {
    const timeline = {
      id: connectionId,
      protocolType: 'https-request',
      protocol: 'https',
      options: { statusCode }
    }
    return new ProtocolAnimationController(timeline, hooks)
  }

  static createDnsQuery(connectionId, resolvedIP = null, hooks = {}) {
    const timeline = {
      id: connectionId,
      protocolType: 'dns-query',
      protocol: 'dns',
      options: { resolvedIP }
    }
    return new ProtocolAnimationController(timeline, hooks)
  }

  static createTimeout(connectionId, options = {}, hooks = {}) {
    const timeline = {
      id: connectionId,
      protocolType: 'timeout',
      protocol: 'tcp',
      options: options
    }
    return new ProtocolAnimationController(timeline, hooks)
  }

  static createUdpTransfer(connectionId, hooks = {}) {
    const timeline = {
      id: connectionId,
      protocolType: 'udp-transfer',
      protocol: 'udp'
    }
    return new ProtocolAnimationController(timeline, hooks)
  }

  static createIcmpPing(connectionId, rttMs = null, hooks = {}) {
    const timeline = {
      id: connectionId,
      protocolType: 'icmp-ping',
      protocol: 'icmp',
      options: { rttMs }
    }
    return new ProtocolAnimationController(timeline, hooks)
  }

  static createSshSecure(connectionId, hooks = {}) {
    const timeline = {
      id: connectionId,
      protocolType: 'ssh-secure',
      protocol: 'ssh'
    }
    return new ProtocolAnimationController(timeline, hooks)
  }
}
