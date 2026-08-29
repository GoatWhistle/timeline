import { describe, expect, it } from 'vitest'
import {
  buildCalendarGrid,
  dayIndex,
  dayIndexOf,
  gridStart,
  WEEK_STARTS_ON,
} from '@/features/schedule/model/calendar-grid'
import { DAYS_PER_WEEK } from '@/features/schedule/model/pack-lanes'

const from = new Date(2026, 0, 15)
const to = new Date(2026, 1, 10)

describe('gridStart', () => {
  it('snaps back to the Monday of the containing week', () => {
    expect(gridStart(new Date(2026, 0, 15)).getDay()).toBe(WEEK_STARTS_ON)
    expect(gridStart(new Date(2026, 0, 15)).getDate()).toBe(12)
  })

  it('leaves a Monday where it is', () => {
    const monday = new Date(2026, 0, 12)
    expect(gridStart(monday).getTime()).toBe(monday.getTime())
  })

  it('drops the time of day', () => {
    const start = gridStart(new Date(2026, 0, 15, 18, 30))
    expect([start.getHours(), start.getMinutes(), start.getSeconds()]).toEqual([0, 0, 0])
  })
})

describe('buildCalendarGrid', () => {
  it('gives every week exactly seven days', () => {
    const grid = buildCalendarGrid(from, to)
    for (const week of grid.weeks) expect(week.days).toHaveLength(DAYS_PER_WEEK)
  })

  it('covers the whole requested range', () => {
    const grid = buildCalendarGrid(from, to)
    const days = grid.weeks.flatMap((week) => week.days)
    expect(days[0]?.date.getTime()).toBeLessThanOrEqual(from.getTime())
    expect(days[days.length - 1]?.date.getTime()).toBeGreaterThanOrEqual(to.getTime())
  })

  it('numbers days consecutively from zero', () => {
    const grid = buildCalendarGrid(from, to)
    const indices = grid.weeks.flatMap((week) => week.days).map((day) => day.index)
    expect(indices).toEqual(indices.map((_, position) => position))
  })

  it('reports a day count matching seven per week', () => {
    const grid = buildCalendarGrid(from, to)
    expect(grid.dayCount).toBe(grid.weekCount * DAYS_PER_WEEK)
    expect(grid.weeks).toHaveLength(grid.weekCount)
  })

  it('marks the days outside the range as out of range', () => {
    const grid = buildCalendarGrid(from, to)
    const days = grid.weeks.flatMap((week) => week.days)
    expect(days[0]?.inRange).toBe(false)
    expect(days.some((day) => day.inRange)).toBe(true)
  })

  it('flags the first day of each month', () => {
    const grid = buildCalendarGrid(from, to)
    const firsts = grid.weeks
      .flatMap((week) => week.days)
      .filter((day) => day.isFirstOfMonth)
      .map((day) => day.date.getMonth())
    expect(firsts).toEqual([1])
  })

  it('always produces at least one week', () => {
    const single = buildCalendarGrid(new Date(2026, 0, 15), new Date(2026, 0, 15))
    expect(single.weekCount).toBe(1)
  })

  it('spans several weeks for a long range', () => {
    const grid = buildCalendarGrid(new Date(2026, 0, 1), new Date(2026, 2, 31))
    expect(grid.weekCount).toBeGreaterThanOrEqual(13)
  })
})

describe('dayIndex', () => {
  it('gives zero for the first day of the grid', () => {
    const grid = buildCalendarGrid(from, to)
    expect(dayIndex(grid, grid.start)).toBe(0)
  })

  it('counts calendar days from the grid start', () => {
    const grid = buildCalendarGrid(from, to)
    expect(dayIndex(grid, new Date(2026, 0, 15))).toBe(3)
  })

  it('ignores the time of day', () => {
    const grid = buildCalendarGrid(from, to)
    expect(dayIndex(grid, new Date(2026, 0, 15, 23, 59))).toBe(
      dayIndex(grid, new Date(2026, 0, 15, 0, 1)),
    )
  })

  it('goes negative before the grid start', () => {
    const grid = buildCalendarGrid(from, to)
    expect(dayIndex(grid, new Date(2026, 0, 10))).toBe(-2)
  })
})

describe('dayIndexOf', () => {
  it('reads an ISO timestamp as a day index', () => {
    const grid = buildCalendarGrid(from, to)
    expect(dayIndexOf(grid, new Date(2026, 0, 15).toISOString())).toBe(3)
  })

  it('returns NaN for an unparsable timestamp', () => {
    const grid = buildCalendarGrid(from, to)
    expect(Number.isNaN(dayIndexOf(grid, 'not a date'))).toBe(true)
  })
})
