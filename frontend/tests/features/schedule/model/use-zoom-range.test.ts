import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ScheduleScale } from '@/features/schedule/model/schedule-scale'
import { useZoomRange, ZOOM_DURATION } from '@/features/schedule/model/use-zoom-range'
import { type Range, scaleSpanMs, spanOf } from '@/features/schedule/model/zoom-range'

const DAY = 86_400_000
const FOCUS = new Date('2026-02-01T00:00:00Z').getTime()
const BOUNDS: Range = { from: FOCUS - 400 * DAY, to: FOCUS + 400 * DAY }

type Frame = (time: number) => void

function driveFrames() {
  const callbacks: Frame[] = []
  let clock = 0

  vi.stubGlobal('requestAnimationFrame', (cb: Frame) => {
    callbacks.push(cb)
    return callbacks.length
  })
  vi.stubGlobal('cancelAnimationFrame', () => {})
  vi.spyOn(performance, 'now').mockImplementation(() => clock)

  return {
    advance(ms: number) {
      clock += ms
      const pending = callbacks.splice(0, callbacks.length)
      for (const cb of pending) cb(clock)
    },
    get pending() {
      return callbacks.length
    },
  }
}

function renderZoom(scale: ScheduleScale = 'month') {
  return renderHook(
    ({ value }: { value: ScheduleScale }) =>
      useZoomRange({ bounds: BOUNDS, scale: value, focus: FOCUS }),
    { initialProps: { value: scale } },
  )
}

describe('useZoomRange', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('starts at the range for the requested scale', () => {
    const { result } = renderZoom('month')
    expect(spanOf(result.current)).toBeCloseTo(scaleSpanMs('month'), -6)
  })

  it('interpolates through intermediate spans instead of jumping', () => {
    const frames = driveFrames()
    const { result, rerender } = renderZoom('month')
    const startSpan = spanOf(result.current)

    act(() => {
      rerender({ value: 'quarter' })
    })
    act(() => {
      frames.advance(ZOOM_DURATION / 2)
    })

    const middle = spanOf(result.current)
    expect(middle).toBeGreaterThan(startSpan)
    expect(middle).toBeLessThan(scaleSpanMs('quarter'))
  })

  it('settles exactly on the target range', () => {
    const frames = driveFrames()
    const { result, rerender } = renderZoom('month')

    act(() => {
      rerender({ value: 'week' })
    })
    act(() => {
      frames.advance(ZOOM_DURATION)
    })

    expect(spanOf(result.current)).toBeCloseTo(scaleSpanMs('week'), -6)
  })

  it('stops requesting frames once it has settled', () => {
    const frames = driveFrames()
    const { rerender } = renderZoom('month')

    act(() => {
      rerender({ value: 'week' })
    })
    act(() => {
      frames.advance(ZOOM_DURATION)
    })
    act(() => {
      frames.advance(ZOOM_DURATION)
    })

    expect(frames.pending).toBe(0)
  })

  it('jumps straight to the target when motion is reduced', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: true,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }))
    const { result, rerender } = renderZoom('month')

    act(() => {
      rerender({ value: 'quarter' })
    })

    expect(spanOf(result.current)).toBeCloseTo(scaleSpanMs('quarter'), -6)
  })

  it('keeps the range inside the bounds', () => {
    const { result } = renderZoom('quarter')
    expect(result.current.from).toBeGreaterThanOrEqual(BOUNDS.from)
    expect(result.current.to).toBeLessThanOrEqual(BOUNDS.to)
  })
})
