import { describe, expect, it } from 'vitest'
import type { CalendarSpan } from '@/features/schedule/model/calendar-items'
import {
  buildMonthBlock,
  buildMonthBlocks,
  packMonthWeek,
} from '@/features/schedule/model/month-grid'
import { WRAPPED_MIN_BAR, wrappedBarHeight } from '@/features/schedule/model/schedule-scale'

function span(id: string, start: string, end: string): CalendarSpan {
  return {
    id,
    startDay: 0,
    endDay: 0,
    row: {
      event_id: id,
      title: id,
      kind: 'HACKATHON',
      state: 'ACTIVE',
      start_at: start,
      end_at: end,
      effective_format: 'ONLINE',
      stages: [],
    },
    items: [],
    marks: [],
  }
}

const JULY = new Date('2026-07-15T00:00:00Z')

describe('the month block shows its own days only', () => {
  it('marks days of the neighbouring months as outside the month', () => {
    const block = buildMonthBlock(JULY)
    const outside = block.weeks.flatMap((week) => week.days).filter((day) => !day.inMonth)

    expect(outside.length).toBeGreaterThan(0)
    for (const day of outside) expect(day.date.getMonth()).not.toBe(6)
  })

  it('keeps every day of the month itself', () => {
    const block = buildMonthBlock(JULY)
    const inside = block.weeks.flatMap((week) => week.days).filter((day) => day.inMonth)

    expect(inside).toHaveLength(31)
    expect(new Set(inside.map((day) => day.date.getDate())).size).toBe(31)
  })

  it('builds one block per requested month, so a year is twelve', () => {
    expect(buildMonthBlocks(JULY, 12)).toHaveLength(12)
    expect(buildMonthBlocks(JULY, 3)).toHaveLength(3)
    expect(buildMonthBlocks(JULY, 1)).toHaveLength(1)
  })
})

describe('a crowded week drops no event', () => {
  it('packs every overlapping span into its own lane rather than hiding any', () => {
    const week = buildMonthBlock(JULY).weeks[1]
    if (!week) throw new Error('the month must have a second week')
    const days = week.days
    const from = days[0]?.date.toISOString() ?? ''
    const to = days[days.length - 1]?.date.toISOString() ?? ''

    const spans = Array.from({ length: 9 }, (_, index) => span(`e${index}`, from, to))
    const row = packMonthWeek(week, spans)

    expect(row.bars).toHaveLength(9)
    expect(row.laneCount).toBe(9)
    expect(new Set(row.bars.map((bar) => bar.lane)).size).toBe(9)
  })

  it('clips a bar that began before the week instead of dropping it', () => {
    const week = buildMonthBlock(JULY).weeks[2]
    if (!week) throw new Error('the month must have a third week')
    const row = packMonthWeek(week, [span('early', '2026-07-01T00:00:00Z', '2026-07-31T00:00:00Z')])

    expect(row.bars).toHaveLength(1)
    expect(row.bars[0]?.clippedStart).toBe(true)
  })
})

describe('bar height answers the room the week has', () => {
  it('shrinks as lanes multiply so every lane still fits the cell', () => {
    const cell = 46
    const roomy = wrappedBarHeight(cell, 10, 1)
    const crowded = wrappedBarHeight(cell, 10, 6)

    expect(roomy).toBeGreaterThan(crowded)
    expect(crowded).toBeGreaterThanOrEqual(WRAPPED_MIN_BAR)
  })

  it('never returns less than the legible minimum, however many lanes', () => {
    expect(wrappedBarHeight(46, 10, 40)).toBe(WRAPPED_MIN_BAR)
  })

  it('never exceeds the height the scale asked for', () => {
    expect(wrappedBarHeight(400, 10, 1)).toBe(10)
  })
})

describe('a bar stops at the edge of the month it is drawn in', () => {
  const september = new Date('2026-09-15T00:00:00Z')
  const block = buildMonthBlock(september)
  const firstWeek = block.weeks[0]
  const lastWeek = block.weeks[block.weeks.length - 1]

  it('never paints an event onto the trailing days of the month before', () => {
    if (!firstWeek) throw new Error('september has a first week')
    const outside = firstWeek.days.filter((day) => !day.inMonth).length
    const row = packMonthWeek(firstWeek, [
      span('northwind', '2026-09-01T09:00:00Z', '2026-09-10T18:00:00Z'),
    ])

    expect(outside).toBeGreaterThan(0)
    for (const bar of row.bars) expect(bar.startColumn).toBeGreaterThanOrEqual(outside)
  })

  it('never runs past the last day into numbers the month does not have', () => {
    if (!lastWeek) throw new Error('september has a last week')
    const inMonth = lastWeek.days.filter((day) => day.inMonth).length
    const row = packMonthWeek(lastWeek, [
      span('long', '2026-09-20T09:00:00Z', '2026-10-12T18:00:00Z'),
    ])

    for (const bar of row.bars) expect(bar.startColumn + bar.columns).toBeLessThanOrEqual(inMonth)
  })

  it('still draws an event that lives wholly inside the month', () => {
    if (!firstWeek) throw new Error('september has a first week')
    const row = packMonthWeek(firstWeek, [
      span('inside', '2026-09-02T09:00:00Z', '2026-09-04T18:00:00Z'),
    ])

    expect(row.bars).toHaveLength(1)
    expect(row.bars[0]?.columns).toBe(3)
  })
})
