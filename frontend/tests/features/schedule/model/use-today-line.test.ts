import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TODAY_TICK_MS, TODAY_VARIABLE } from '@/features/schedule/model/schedule-scale'
import {
  buildTimelineGrid,
  dayIndex,
  type TimelineGrid,
} from '@/features/schedule/model/timeline-grid'
import { useTodayLine } from '@/features/schedule/model/use-today-line'

const NOW = new Date(2026, 0, 15, 12)
const DAY_WIDTH = 40

function gridAround(offsetDays: number): TimelineGrid {
  const from = new Date(NOW)
  from.setDate(from.getDate() - offsetDays)
  const to = new Date(from)
  to.setDate(to.getDate() + 27)
  return buildTimelineGrid(from, to)
}

function setHidden(hidden: boolean) {
  Object.defineProperty(document, 'hidden', { configurable: true, value: hidden })
  document.dispatchEvent(new Event('visibilitychange'))
}

function renderLine(grid: TimelineGrid = gridAround(7), dayWidth: number = DAY_WIDTH) {
  const element = document.createElement('div')
  document.body.append(element)
  const ref = { current: element as HTMLElement | null }

  const view = renderHook(() => useTodayLine({ target: ref, grid, dayWidth }))

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

  it('writes the offset as pixels along the axis, not a day index', () => {
    const grid = gridAround(7)
    const { element } = renderLine(grid)
    const expected = (dayIndex(grid, NOW) + 0.5) * DAY_WIDTH

    expect(element.style.getPropertyValue(TODAY_VARIABLE)).toBe(`${expected}px`)
  })

  it('moves the line further right as the day grows wider', () => {
    const grid = gridAround(7)
    const narrow = renderLine(grid, 10).element.style.getPropertyValue(TODAY_VARIABLE)
    const wide = renderLine(grid, 80).element.style.getPropertyValue(TODAY_VARIABLE)

    expect(Number.parseFloat(wide)).toBeGreaterThan(Number.parseFloat(narrow))
  })

  it('places the line by the time of day, not only the date', () => {
    const grid = gridAround(7)
    const noon = renderLine(grid).element.style.getPropertyValue(TODAY_VARIABLE)

    vi.setSystemTime(new Date(2026, 0, 15, 23))
    const evening = renderLine(grid).element.style.getPropertyValue(TODAY_VARIABLE)

    expect(Number.parseFloat(evening)).toBeGreaterThan(Number.parseFloat(noon))
  })

  it('re-renders nothing when the timer fires', () => {
    let renders = 0
    const element = document.createElement('div')
    const ref = { current: element as HTMLElement | null }
    const grid = gridAround(7)

    renderHook(() => {
      renders += 1
      useTodayLine({ target: ref, grid, dayWidth: DAY_WIDTH })
    })

    const before = renders
    vi.advanceTimersByTime(TODAY_TICK_MS * 5)
    expect(renders).toBe(before)
  })

  it('keeps writing on every tick', () => {
    const element = document.createElement('div')
    const ref = { current: element as HTMLElement | null }
    const grid = gridAround(7)
    renderHook(() => useTodayLine({ target: ref, grid, dayWidth: DAY_WIDTH }))

    element.style.removeProperty(TODAY_VARIABLE)
    vi.advanceTimersByTime(TODAY_TICK_MS)
    expect(element.style.getPropertyValue(TODAY_VARIABLE)).not.toBe('')
  })

  it('stops the timer while the tab is hidden and resumes on return', () => {
    const element = document.createElement('div')
    const ref = { current: element as HTMLElement | null }
    const grid = gridAround(7)
    renderHook(() => useTodayLine({ target: ref, grid, dayWidth: DAY_WIDTH }))

    setHidden(true)
    element.style.removeProperty(TODAY_VARIABLE)
    vi.advanceTimersByTime(TODAY_TICK_MS * 10)
    expect(element.style.getPropertyValue(TODAY_VARIABLE)).toBe('')

    setHidden(false)
    expect(element.style.getPropertyValue(TODAY_VARIABLE)).not.toBe('')
  })

  it('recomputes immediately when the tab comes back', () => {
    const element = document.createElement('div')
    const ref = { current: element as HTMLElement | null }
    const grid = gridAround(7)
    renderHook(() => useTodayLine({ target: ref, grid, dayWidth: DAY_WIDTH }))

    setHidden(true)
    element.style.removeProperty(TODAY_VARIABLE)
    setHidden(false)

    const expected = (dayIndex(grid, NOW) + 0.5) * DAY_WIDTH
    expect(element.style.getPropertyValue(TODAY_VARIABLE)).toBe(`${expected}px`)
  })

  it('flags whether today falls inside the visible grid', () => {
    const past = new Date(NOW)
    past.setDate(past.getDate() - 200)
    const away = buildTimelineGrid(past, new Date(past.getTime() + 20 * 86_400_000))

    expect(renderLine(away).element.dataset.todayVisible).toBe('false')
    expect(renderLine(gridAround(7)).element.dataset.todayVisible).toBe('true')
  })

  it('clears the timer on unmount', () => {
    const element = document.createElement('div')
    const ref = { current: element as HTMLElement | null }
    const grid = gridAround(7)
    const { unmount } = renderHook(() => useTodayLine({ target: ref, grid, dayWidth: DAY_WIDTH }))

    unmount()
    element.style.removeProperty(TODAY_VARIABLE)
    vi.advanceTimersByTime(TODAY_TICK_MS * 10)
    expect(element.style.getPropertyValue(TODAY_VARIABLE)).toBe('')
  })
})
