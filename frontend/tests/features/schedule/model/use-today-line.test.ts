import { renderHook } from '@testing-library/react'
import { createRef } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildCalendarGrid,
  type CalendarGrid,
  dayIndex,
} from '@/features/schedule/model/calendar-grid'
import {
  type ScheduleScale,
  TODAY_TICK_MS,
  TODAY_VARIABLE,
} from '@/features/schedule/model/schedule-scale'
import { useTodayLine } from '@/features/schedule/model/use-today-line'

const NOW = new Date(2026, 0, 15, 12)

function gridAround(offsetDays: number): CalendarGrid {
  const from = new Date(NOW)
  from.setDate(from.getDate() - offsetDays)
  const to = new Date(from)
  to.setDate(to.getDate() + 27)
  return buildCalendarGrid(from, to)
}

function setHidden(hidden: boolean) {
  Object.defineProperty(document, 'hidden', { configurable: true, value: hidden })
  document.dispatchEvent(new Event('visibilitychange'))
}

function renderLine(scale: ScheduleScale = 'month', grid: CalendarGrid = gridAround(7)) {
  const element = document.createElement('div')
  document.body.append(element)
  const ref = createRef<HTMLElement | null>() as { current: HTMLElement | null }
  ref.current = element

  const view = renderHook(
    ({ tick }: { tick: ScheduleScale }) => useTodayLine({ target: ref, scale: tick, grid }),
    { initialProps: { tick: scale } },
  )

  return { element, view }
}

describe('useTodayLine', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    Object.defineProperty(document, 'hidden', { configurable: true, value: false })
  })

  afterEach(() => {
    vi.useRealTimers()
    document.body.replaceChildren()
  })

  it('writes the day index into a CSS custom property instead of React state', () => {
    const grid = gridAround(7)
    const { element } = renderLine('month', grid)
    expect(element.style.getPropertyValue(TODAY_VARIABLE)).toBe(`${dayIndex(grid, NOW)}`)
  })

  it('re-renders nothing when the timer fires', () => {
    let renders = 0
    const element = document.createElement('div')
    const ref = { current: element as HTMLElement | null }
    const grid = gridAround(7)

    renderHook(() => {
      renders += 1
      useTodayLine({ target: ref, scale: 'month', grid })
    })

    const before = renders
    vi.advanceTimersByTime(TODAY_TICK_MS.month * 5)
    expect(renders).toBe(before)
  })

  it('keeps writing on every tick', () => {
    const element = document.createElement('div')
    const ref = { current: element as HTMLElement | null }
    const grid = gridAround(7)
    renderHook(() => useTodayLine({ target: ref, scale: 'month', grid }))

    element.style.removeProperty(TODAY_VARIABLE)
    vi.advanceTimersByTime(TODAY_TICK_MS.month)
    expect(element.style.getPropertyValue(TODAY_VARIABLE)).not.toBe('')
  })

  it('ticks faster at the week scale than at the quarter scale', () => {
    expect(TODAY_TICK_MS.week).toBeLessThan(TODAY_TICK_MS.month)
    expect(TODAY_TICK_MS.month).toBeLessThan(TODAY_TICK_MS.quarter)
  })

  it('stops the timer while the tab is hidden and resumes on return', () => {
    const element = document.createElement('div')
    const ref = { current: element as HTMLElement | null }
    const grid = gridAround(7)
    renderHook(() => useTodayLine({ target: ref, scale: 'month', grid }))

    setHidden(true)
    element.style.removeProperty(TODAY_VARIABLE)
    vi.advanceTimersByTime(TODAY_TICK_MS.month * 10)
    expect(element.style.getPropertyValue(TODAY_VARIABLE)).toBe('')

    setHidden(false)
    expect(element.style.getPropertyValue(TODAY_VARIABLE)).not.toBe('')
  })

  it('recomputes immediately when the tab comes back', () => {
    const element = document.createElement('div')
    const ref = { current: element as HTMLElement | null }
    const grid = gridAround(7)
    renderHook(() => useTodayLine({ target: ref, scale: 'month', grid }))

    setHidden(true)
    element.style.removeProperty(TODAY_VARIABLE)
    setHidden(false)

    expect(element.style.getPropertyValue(TODAY_VARIABLE)).toBe(`${dayIndex(grid, NOW)}`)
  })

  it('flags whether today falls inside the visible grid', () => {
    const past = new Date(NOW)
    past.setDate(past.getDate() - 200)
    const away = buildCalendarGrid(past, new Date(past.getTime() + 20 * 86_400_000))

    expect(renderLine('month', away).element.dataset.todayVisible).toBe('false')
    expect(renderLine('month', gridAround(7)).element.dataset.todayVisible).toBe('true')
  })

  it('clears the timer on unmount', () => {
    const element = document.createElement('div')
    const ref = { current: element as HTMLElement | null }
    const grid = gridAround(7)
    const { unmount } = renderHook(() => useTodayLine({ target: ref, scale: 'month', grid }))

    unmount()
    element.style.removeProperty(TODAY_VARIABLE)
    vi.advanceTimersByTime(TODAY_TICK_MS.month * 10)
    expect(element.style.getPropertyValue(TODAY_VARIABLE)).toBe('')
  })
})
