import { renderHook } from '@testing-library/react'
import { createRef } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  type ScheduleScale,
  TODAY_TICK_MS,
  TODAY_VARIABLE,
} from '@/features/schedule/model/schedule-scale'
import { useTodayLine } from '@/features/schedule/model/use-today-line'

function setHidden(hidden: boolean) {
  Object.defineProperty(document, 'hidden', { configurable: true, value: hidden })
  document.dispatchEvent(new Event('visibilitychange'))
}

function renderLine(scale: ScheduleScale = 'month', x: (date: Date) => number = () => 120) {
  const element = document.createElement('div')
  document.body.append(element)
  const ref = createRef<HTMLElement | null>() as { current: HTMLElement | null }
  ref.current = element

  const view = renderHook(
    ({ tick }: { tick: ScheduleScale }) =>
      useTodayLine({ target: ref, scale: tick, x, width: 1000 }),
    { initialProps: { tick: scale } },
  )

  return { element, view }
}

describe('useTodayLine', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    Object.defineProperty(document, 'hidden', { configurable: true, value: false })
  })

  afterEach(() => {
    vi.useRealTimers()
    document.body.replaceChildren()
  })

  it('writes the position into a CSS custom property instead of React state', () => {
    const { element } = renderLine()
    expect(element.style.getPropertyValue(TODAY_VARIABLE)).toBe('120px')
  })

  it('re-renders nothing when the timer fires', () => {
    let renders = 0
    const element = document.createElement('div')
    const ref = { current: element as HTMLElement | null }

    renderHook(() => {
      renders += 1
      useTodayLine({ target: ref, scale: 'month', x: () => Date.now() % 1000, width: 1000 })
    })

    const before = renders
    vi.advanceTimersByTime(TODAY_TICK_MS.month * 5)
    expect(renders).toBe(before)
  })

  it('keeps writing on every tick', () => {
    const element = document.createElement('div')
    const ref = { current: element as HTMLElement | null }
    let calls = 0
    renderHook(() =>
      useTodayLine({
        target: ref,
        scale: 'month',
        x: () => {
          calls += 1
          return 10
        },
        width: 1000,
      }),
    )

    const initial = calls
    vi.advanceTimersByTime(TODAY_TICK_MS.month * 3)
    expect(calls).toBeGreaterThan(initial)
  })

  it('ticks faster at the week scale than at the quarter scale', () => {
    expect(TODAY_TICK_MS.week).toBeLessThan(TODAY_TICK_MS.month)
    expect(TODAY_TICK_MS.month).toBeLessThan(TODAY_TICK_MS.quarter)
  })

  it('stops the timer while the tab is hidden and resumes on return', () => {
    let calls = 0
    const element = document.createElement('div')
    const ref = { current: element as HTMLElement | null }
    renderHook(() =>
      useTodayLine({
        target: ref,
        scale: 'month',
        x: () => {
          calls += 1
          return 10
        },
        width: 1000,
      }),
    )

    setHidden(true)
    const whileHidden = calls
    vi.advanceTimersByTime(TODAY_TICK_MS.month * 10)
    expect(calls).toBe(whileHidden)

    setHidden(false)
    expect(calls).toBeGreaterThan(whileHidden)
  })

  it('recomputes immediately when the tab comes back', () => {
    const positions = [10, 900]
    let index = 0
    const element = document.createElement('div')
    const ref = { current: element as HTMLElement | null }
    renderHook(() =>
      useTodayLine({
        target: ref,
        scale: 'month',
        x: () => positions[Math.min(index++, positions.length - 1)] ?? 0,
        width: 1000,
      }),
    )

    setHidden(true)
    setHidden(false)
    expect(element.style.getPropertyValue(TODAY_VARIABLE)).toBe('900px')
  })

  it('flags whether today falls inside the visible range', () => {
    const outside = renderLine('month', () => 5000)
    expect(outside.element.dataset.todayVisible).toBe('false')

    const inside = renderLine('month', () => 500)
    expect(inside.element.dataset.todayVisible).toBe('true')
  })

  it('clears the timer on unmount', () => {
    let calls = 0
    const element = document.createElement('div')
    const ref = { current: element as HTMLElement | null }
    const { unmount } = renderHook(() =>
      useTodayLine({
        target: ref,
        scale: 'month',
        x: () => {
          calls += 1
          return 10
        },
        width: 1000,
      }),
    )

    unmount()
    const after = calls
    vi.advanceTimersByTime(TODAY_TICK_MS.month * 10)
    expect(calls).toBe(after)
  })
})
