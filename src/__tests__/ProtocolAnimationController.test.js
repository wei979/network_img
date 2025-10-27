import { describe, it, expect, vi } from 'vitest'
import { ProtocolAnimationController } from '../lib/ProtocolAnimationController'

const sampleTimeline = {
  id: 'tcp-10.0.0.5-443-12345',
  protocol: 'tcp',
  startEpochMs: 0,
  endEpochMs: 1500,
  stages: [
    { key: 'syn', label: 'SYN Sent', direction: 'forward', durationMs: 500 },
    { key: 'syn-ack', label: 'SYN-ACK Received', direction: 'backward', durationMs: 500 },
    { key: 'ack', label: 'ACK Confirmed', direction: 'forward', durationMs: 500 }
  ]
}

describe('ProtocolAnimationController', () => {
  it('tracks total duration and resets to first stage', () => {
    const controller = new ProtocolAnimationController(sampleTimeline)
    expect(controller.totalDuration).toBe(1500)

    controller.advance(800)
    expect(controller.state.currentStage.key).toBe('syn-ack')

    controller.reset()
    expect(controller.state.currentStage.key).toBe('syn')
    expect(controller.getRenderableState().timelineProgress).toBe(0)
  })

  it('advances through stages with default speed', () => {
    const controller = new ProtocolAnimationController(sampleTimeline)

    controller.advance(400)
    expect(controller.state.currentStage.key).toBe('syn')

    controller.advance(200)
    expect(controller.state.currentStage.key).toBe('syn-ack')
  })

  it('supports seeking to arbitrary timeline position', () => {
    const controller = new ProtocolAnimationController(sampleTimeline)

    controller.seek(1100)
    expect(controller.state.currentStage.key).toBe('ack')

    controller.seek(5000)
    expect(controller.state.currentStage.key).toBe('ack')
  })

  it('notifies on stage transitions and exposes render state', () => {
    const onStageEnter = vi.fn()
    const controller = new ProtocolAnimationController(sampleTimeline, { onStageEnter })

    controller.advance(600)
    expect(onStageEnter).toHaveBeenCalledWith(expect.objectContaining({ key: 'syn-ack' }))

    const renderState = controller.getRenderableState()
    expect(renderState.stageIndex).toBe(1)
    expect(renderState.currentStage.key).toBe('syn-ack')
    expect(renderState.timelineProgress).toBeGreaterThan(0)
  })
})
