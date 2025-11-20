import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Activity, Loader2, RefreshCcw } from 'lucide-react'
import { ProtocolAnimationController } from './lib/ProtocolAnimationController'

const API_TIMELINES_URL = '/api/timelines'
const STATIC_TIMELINES_URL = '/data/protocol_timeline_sample.json'

const STAGE_LABEL_MAP = {
  'SYN Sent': 'SYN 送出',
  'SYN-ACK Received': 'SYN-ACK 收到',
  'ACK Confirmed': 'ACK 確認',
  'UDP Transfer': 'UDP 傳輸'
}

const translateStageLabel = (label) => STAGE_LABEL_MAP[label] ?? label

const sumStageDurations = (timeline) =>
  Array.isArray(timeline?.stages)
    ? timeline.stages.reduce((total, stage) => total + (stage?.durationMs || 0), 0)
    : 0

const deriveConnectionPair = (timeline) => {
  if (!timeline?.id) {
    return { src: '未知', dst: '未知' }
  }
  const parts = timeline.id.split('-')
  if (parts.length < 5) {
    return { src: timeline.id, dst: timeline.id }
  }
  return {
    src: `${parts[1]}:${parts[2]}`,
    dst: `${parts[3]}:${parts[4]}`
  }
}

const StagePill = ({ stage, stageProgress }) => {
  const label = translateStageLabel(stage?.label) ?? '無資料'
  const stageKey = stage?.key ?? '未知'
  const direction = stage?.direction ?? '不適用'
  const percent = Math.round((stageProgress || 0) * 100)

  return (
    <div className="flex items-center justify-between bg-gray-900/60 border border-gray-700 rounded-md px-3 py-2">
      <div>
        <p className="text-sm font-semibold text-blue-300">{label}</p>
        <p className="text-xs text-gray-400 uppercase tracking-wide">{stageKey}</p>
      </div>
      <div className="flex items-end flex-col">
        <span className="text-xs text-gray-400">{direction}</span>
        <span className="text-xs text-gray-500">{percent}%</span>
      </div>
    </div>
  )
}

const ProgressBar = ({ value }) => (
  <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
    <div
      className="h-full bg-gradient-to-r from-blue-500 to-teal-400 transition-all duration-150"
      style={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }}
    />
  </div>
)

const ProtocolTimelinePreview = () => {
  const [timelines, setTimelines] = useState([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [renderState, setRenderState] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)
  const controllerRef = useRef(null)
  const rafRef = useRef(null)

  useEffect(() => {
    let cancelled = false

    const loadTimelines = async () => {
      setLoading(true)
      setError(null)
      setTimelines([])

      const fetchCandidate = async (url) => {
        try {
          const response = await fetch(url, { cache: 'no-store' })
          if (!response.ok) {
            return null
          }
          return await response.json()
        } catch (fetchError) {
          return null
        }
      }

      const apiResult = await fetchCandidate(API_TIMELINES_URL)
      const finalResult = apiResult || (await fetchCandidate(STATIC_TIMELINES_URL))

      if (cancelled) {
        return
      }

      if (!finalResult || !Array.isArray(finalResult.timelines) || !finalResult.timelines.length) {
        setError('無法載入協定時間軸範例資料')
        setLoading(false)
        return
      }

      setTimelines(finalResult.timelines)
      setActiveIndex(0)
      setLoading(false)
    }

    loadTimelines()

    return () => {
      cancelled = true
    }
  }, [reloadKey])

  useEffect(() => {
    const timeline = timelines[activeIndex]
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }

    if (!timeline || !Array.isArray(timeline.stages) || !timeline.stages.length) {
      setRenderState(null)
      controllerRef.current = null
      return undefined
    }

    const controller = new ProtocolAnimationController(timeline, {
      onStageEnter: () => {
        setRenderState(controller.getRenderableState())
      }
    })

    controllerRef.current = controller
    controller.reset()
    setRenderState(controller.getRenderableState())

    let previous = performance.now()
    const totalDuration = controller.totalDuration || sumStageDurations(timeline)

    const tick = (now) => {
      const delta = now - previous
      previous = now
      controller.advance(delta)
      setRenderState(controller.getRenderableState())

      if (totalDuration && controller.elapsedMs >= totalDuration) {
        controller.reset()
        previous = now
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [timelines, activeIndex])

  const visibleTimelines = useMemo(() => timelines.slice(0, 6), [timelines])
  const activeTimeline = timelines[activeIndex]
  const stageCount = activeTimeline?.stages?.length || 0
  const connectionParts = deriveConnectionPair(activeTimeline)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 text-gray-400">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        正在載入協定時間軸範例...
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-between p-4 bg-red-900/20 border border-red-500/40 rounded-md text-sm text-red-200">
        <span>{error}</span>
        <button
          type="button"
          className="inline-flex items-center text-xs font-semibold hover:text-red-100"
          onClick={() => setReloadKey((key) => key + 1)}
        >
          <RefreshCcw className="w-3 h-3 mr-1" />
          重新嘗試
        </button>
      </div>
    )
  }

  if (!activeTimeline) {
    return null
  }

  const remainingCount = timelines.length - visibleTimelines.length

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold flex items-center">
          <Activity className="w-5 h-5 text-teal-400 mr-2" />
          協定時間軸預覽（範例）
        </h3>
        <span className="text-xs text-gray-400">
          {`總計 ${timelines.length} 條流程${remainingCount > 0 ? `，顯示前 ${visibleTimelines.length} 條` : ''}`}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <div className="space-y-2">
          {visibleTimelines.map((timeline, index) => {
            const isActive = index === activeIndex
            return (
              <button
                key={timeline.id}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={`w-full text-left px-3 py-2 rounded-md border transition-colors ${
                  isActive
                    ? 'border-blue-500/70 bg-blue-500/10 text-blue-100'
                    : 'border-gray-700 bg-gray-900/50 text-gray-300 hover:border-gray-600'
                }`}
              >
                <p className="text-sm font-semibold truncate">{timeline.id}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {timeline.protocol.toUpperCase()} · {timeline.stages.length} stages
                </p>
              </button>
            )
          })}
        </div>

        <div className="flex flex-col space-y-4">
          <div>
            <div className="flex items-center justify-between text-sm text-gray-300 mb-1">
          <span>時間軸進度</span>
              <span>
                {Math.round((renderState?.timelineProgress || 0) * 100)}% ? {stageCount} 個階段
              </span>
            </div>
            <ProgressBar value={renderState?.timelineProgress || 0} />
          </div>

          {renderState?.currentStage ? (
            <StagePill stage={renderState.currentStage} stageProgress={renderState.stageProgress || 0} />
          ) : (
            <div className="text-sm text-gray-400">目前沒有進行中的階段</div>
          )}

          <div className="grid grid-cols-2 gap-3 text-xs text-gray-400">
            <div className="bg-gray-900/50 border border-gray-700 rounded-md p-3">
              <p className="uppercase tracking-wider text-gray-500">來源</p>
              <p className="font-mono text-sm text-gray-200 mt-1">{connectionParts.src}</p>
            </div>
            <div className="bg-gray-900/50 border border-gray-700 rounded-md p-3">
              <p className="uppercase tracking-wider text-gray-500">目的端</p>
              <p className="font-mono text-sm text-gray-200 mt-1">{connectionParts.dst}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProtocolTimelinePreview
