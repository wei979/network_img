import { useEffect, useRef, useState } from 'react'
import { ProtocolAnimationController } from '../lib/ProtocolAnimationController'

/**
 * useAnimationLoop — Manages protocol animation controllers and the RAF loop.
 *
 * @param {Array} filteredTimelines - Visible timeline data
 * @param {boolean} isPaused - Global pause flag
 * @param {React.MutableRefObject} externalRefsRef - Stable ref containing external state/setters.
 *   Fields are updated each render by the caller; the ref identity never changes.
 *   { isGlobalPlaying, globalSpeed, globalDuration, globalTimeRef,
 *     particleSystemRef, selectedConnectionIdRef, activeParticleIndices,
 *     setGlobalTimeDisplay, setParticleTimeInfo, setActiveParticleIndices }
 * @returns {{ renderStates, controllersRef }}
 */
export default function useAnimationLoop(filteredTimelines, isPaused, externalRefsRef) {
  const controllersRef = useRef(new Map())
  const [renderStates, setRenderStates] = useState({})
  const rafRef = useRef(null)
  const lastTickRef = useRef(performance.now())
  const lastUIUpdateRef = useRef(0)

  useEffect(() => {
    if (!filteredTimelines.length) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      controllersRef.current.clear()
      setRenderStates({})
      return
    }

    lastTickRef.current = performance.now()

    const tick = (timestamp) => {
      const delta = Math.min(timestamp - lastTickRef.current, 100)
      lastTickRef.current = timestamp

      const {
        isGlobalPlaying, globalSpeed, globalDuration, globalTimeRef,
        particleSystemRef, selectedConnectionIdRef, activeParticleIndices,
        setGlobalTimeDisplay, setParticleTimeInfo, setActiveParticleIndices
      } = externalRefsRef.current

      // Global time update
      if (isGlobalPlaying && !isPaused && globalDuration > 0) {
        globalTimeRef.current += delta * globalSpeed
        while (globalTimeRef.current >= globalDuration) {
          globalTimeRef.current -= globalDuration
        }
        while (globalTimeRef.current < 0) {
          globalTimeRef.current += globalDuration
        }

        const nowMs = performance.now()
        if (nowMs - lastUIUpdateRef.current > 100) {
          setGlobalTimeDisplay(globalTimeRef.current)
          lastUIUpdateRef.current = nowMs
        }
      }

      // Particle system sync
      if (particleSystemRef.current && selectedConnectionIdRef.current && globalDuration > 0) {
        particleSystemRef.current.setGlobalTime(
          globalTimeRef.current,
          globalDuration
        )

        const globalProgress = globalDuration > 0 ? globalTimeRef.current / globalDuration : 0
        const nowMs2 = performance.now()
        if (nowMs2 - lastUIUpdateRef.current > 100) {
          setParticleTimeInfo({
            current: (globalTimeRef.current / 1000).toFixed(2),
            total: (globalDuration / 1000).toFixed(2),
            progress: globalProgress
          })
          lastUIUpdateRef.current = nowMs2
        }

        const activeParticles = particleSystemRef.current.getActiveParticles()
        const newActiveIndices = new Set(activeParticles.map(p => p.index))
        if (newActiveIndices.size > 0 || activeParticleIndices.size > 0) {
          const currentIndicesArray = [...activeParticleIndices].sort()
          const newIndicesArray = [...newActiveIndices].sort()
          const hasChanged = currentIndicesArray.length !== newIndicesArray.length ||
            currentIndicesArray.some((v, i) => v !== newIndicesArray[i])
          if (hasChanged) {
            setActiveParticleIndices(newActiveIndices)
          }
        }
      }

      // Protocol animation controllers
      if (!isPaused && filteredTimelines.length > 0) {
        const filteredIds = new Set(filteredTimelines.map(t => t.id))
        for (const id of controllersRef.current.keys()) {
          if (!filteredIds.has(id)) controllersRef.current.delete(id)
        }
        filteredTimelines.forEach(timeline => {
          if (!controllersRef.current.has(timeline.id)) {
            const controller = new ProtocolAnimationController(timeline)
            controller.reset()
            controllersRef.current.set(timeline.id, controller)
          }
        })

        const newRenderStates = {}
        controllersRef.current.forEach((controller, id) => {
          controller.advance(delta)
          if (controller.isCompleted) {
            controller.reset()
          }
          newRenderStates[id] = controller.getRenderableState()
        })

        setRenderStates(newRenderStates)
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
    }
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [filteredTimelines, isPaused])

  return { renderStates, controllersRef }
}
