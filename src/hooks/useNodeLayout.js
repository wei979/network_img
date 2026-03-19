import { useEffect, useMemo, useRef, useState } from 'react'
import { parseTimelineId, FORCE_PARAMS, calculateDynamicForceParams, calculateForces, applyForces, buildNodeLayout } from '../lib/graphLayout.js'

/**
 * useNodeLayout — Force-directed graph layout simulation.
 *
 * @param {Array} filteredTimelines - Visible timeline data (for buildNodeLayout)
 * @param {number} canvasSize - SVG canvas size
 * @param {Array} timelines - All timelines (for connection extraction)
 * @returns {{ nodePositions, setNodePositions, draggingNodeId, setDraggingNodeId,
 *             draggingNodeIdRef, isLayoutStable, nodesComputed, needsFitToView, setNeedsFitToView }}
 */
export default function useNodeLayout(filteredTimelines, canvasSize, timelines) {
  const [nodePositions, setNodePositions] = useState({})
  const [draggingNodeId, setDraggingNodeId] = useState(null)
  const draggingNodeIdRef = useRef(null)
  const velocitiesRef = useRef(new Map())
  const [isLayoutStable, setIsLayoutStable] = useState(false)
  const isLayoutStableRef = useRef(false)
  const [needsFitToView, setNeedsFitToView] = useState(false)

  // Sync draggingNodeId to ref for animation loop access
  useEffect(() => {
    draggingNodeIdRef.current = draggingNodeId
  }, [draggingNodeId])

  const baseNodes = useMemo(() => buildNodeLayout(filteredTimelines, canvasSize), [filteredTimelines, canvasSize])

  // Force simulation loop
  useEffect(() => {
    if (!baseNodes.length) {
      setNodePositions({})
      setIsLayoutStable(false)
      return
    }

    // Reset stability tracking for this simulation run
    isLayoutStableRef.current = false

    // Initialize positions
    const initialPositions = {}
    baseNodes.forEach(node => {
      initialPositions[node.id] = { x: node.x, y: node.y, isCenter: node.isCenter }
    })
    setNodePositions(initialPositions)

    // Initialize velocities
    velocitiesRef.current.clear()
    baseNodes.forEach(node => {
      velocitiesRef.current.set(node.id, { x: 0, y: 0 })
    })

    // Build connections
    const connections = []
    timelines.forEach((timeline) => {
      const parsed = parseTimelineId(timeline)
      if (parsed && parsed.src?.ip && parsed.dst?.ip) {
        connections.push({ src: parsed.src.ip, dst: parsed.dst.ip })
      }
    })

    // Dynamic force parameters
    const forceParams = calculateDynamicForceParams(baseNodes.length, canvasSize)
    const params = { ...FORCE_PARAMS, ...forceParams }

    let animationFrameId = null
    let iterationCount = 0
    let lastStableCheck = 0

    const simulate = () => {
      if (draggingNodeIdRef.current) {
        animationFrameId = requestAnimationFrame(simulate)
        return
      }

      setNodePositions(currentPositions => {
        const currentNodes = baseNodes.map(node => ({
          ...node,
          x: currentPositions[node.id]?.x ?? node.x,
          y: currentPositions[node.id]?.y ?? node.y
        }))

        const forces = calculateForces(currentNodes, connections, params)
        const updatedNodes = applyForces(currentNodes, forces, velocitiesRef.current, params)

        const newPositions = {}
        updatedNodes.forEach(node => {
          newPositions[node.id] = { x: node.x, y: node.y, isCenter: node.isCenter }
        })

        iterationCount++
        if (iterationCount - lastStableCheck > 30) {
          lastStableCheck = iterationCount

          let totalKineticEnergy = 0
          velocitiesRef.current.forEach(vel => {
            totalKineticEnergy += vel.x * vel.x + vel.y * vel.y
          })

          if (totalKineticEnergy < params.stabilityThreshold) {
            if (!isLayoutStableRef.current) {
              isLayoutStableRef.current = true
              setIsLayoutStable(true)
              setNeedsFitToView(true)
            }
            if (iterationCount > params.initialIterations + 50) {
              return currentPositions
            }
          } else {
            isLayoutStableRef.current = false
            setIsLayoutStable(false)
          }
        }

        return newPositions
      })

      animationFrameId = requestAnimationFrame(simulate)
    }

    animationFrameId = requestAnimationFrame(simulate)

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
      }
    }
  }, [baseNodes, timelines])

  const nodesComputed = useMemo(() => baseNodes.map(n => {
    const pos = nodePositions[n.id]
    if (pos && isFinite(pos.x) && isFinite(pos.y)) {
      return { ...n, ...pos }
    }
    return n
  }), [baseNodes, nodePositions])

  return {
    nodePositions, setNodePositions,
    draggingNodeId, setDraggingNodeId, draggingNodeIdRef,
    isLayoutStable, nodesComputed,
    needsFitToView, setNeedsFitToView,
  }
}
