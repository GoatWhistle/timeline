import { describe, expect, it } from 'vitest'
import {
  addDaysTo,
  buildMonthGrid,
  clampToMonth,
  endOfWeek,
  isOutOfBounds,
  monthOf,
  nearestAllowed,
  shiftMonth,
  startOfWeek,
  withinRange,
} from '@/shared/ui/forms/calendar/month-grid'

describe('the month grid starts on Monday', () => {
  it('opens every week with Monday', () => {
    const cells = buildMonthGrid({ year: 2026, month: 4 })
    for (let week = 0; week < 6; week += 1) {
      const first = cells[week * 7]
      expect(first).toBeDefined()
      const weekday = new Date(`${first?.date}T00:00:00Z`).getUTCDay()
      expect(weekday).toBe(1)
    }
  })

  it('covers six full weeks so the panel never changes height', () => {
    expect(buildMonthGrid({ year: 2026, month: 1 })).toHaveLength(42)
    expect(buildMonthGrid({ year: 2026, month: 7 })).toHaveLength(42)
  })

  it('marks the days that spill in from the neighbouring months', () => {
    const cells = buildMonthGrid({ year: 2026, month: 4 })
    expect(cells[0]?.date).toBe('2026-04-27')
    expect(cells[0]?.outside).toBe(true)
    expect(cells.find((cell) => cell.date === '2026-05-01')?.outside).toBe(false)
  })

  it('marks Saturday and Sunday as the weekend', () => {
    const cells = buildMonthGrid({ year: 2026, month: 4 })
    expect(cells[5]?.weekend).toBe(true)
    expect(cells[6]?.weekend).toBe(true)
    expect(cells[0]?.weekend).toBe(false)
  })
})

describe('moving through the calendar', () => {
  it('steps a day across a month boundary', () => {
    expect(addDaysTo('2026-05-31', 1)).toBe('2026-06-01')
    expect(addDaysTo('2026-05-01', -1)).toBe('2026-04-30')
  })

  it('steps a day across a year boundary', () => {
    expect(addDaysTo('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDaysTo('2027-01-01', -1)).toBe('2026-12-31')
  })

  it('steps a week', () => {
    expect(addDaysTo('2026-05-01', 7)).toBe('2026-05-08')
    expect(addDaysTo('2026-05-01', -7)).toBe('2026-04-24')
  })

  it('finds the Monday and Sunday of the week', () => {
    expect(startOfWeek('2026-05-07')).toBe('2026-05-04')
    expect(endOfWeek('2026-05-07')).toBe('2026-05-10')
    expect(startOfWeek('2026-05-04')).toBe('2026-05-04')
    expect(startOfWeek('2026-05-10')).toBe('2026-05-04')
  })

  it('shifts a month and wraps the year', () => {
    expect(shiftMonth({ year: 2026, month: 11 }, 1)).toEqual({ year: 2027, month: 0 })
    expect(shiftMonth({ year: 2026, month: 0 }, -1)).toEqual({ year: 2025, month: 11 })
  })

  it('clamps a day that the shorter month does not have', () => {
    expect(clampToMonth('2026-01-31', { year: 2026, month: 1 })).toBe('2026-02-28')
    expect(clampToMonth('2026-03-31', { year: 2026, month: 3 })).toBe('2026-04-30')
  })

  it('reads the month of a date', () => {
    expect(monthOf('2026-05-07')).toEqual({ year: 2026, month: 4 })
  })
})

describe('bounds keep the range honest', () => {
  it('disables a day before the minimum and after the maximum', () => {
    const bounds = { min: '2026-05-10', max: '2026-05-20' }
    expect(isOutOfBounds('2026-05-09', bounds)).toBe(true)
    expect(isOutOfBounds('2026-05-10', bounds)).toBe(false)
    expect(isOutOfBounds('2026-05-20', bounds)).toBe(false)
    expect(isOutOfBounds('2026-05-21', bounds)).toBe(true)
  })

  it('allows everything when no bound is given', () => {
    expect(isOutOfBounds('1999-01-01', {})).toBe(false)
  })

  it('pulls a forbidden day back to the nearest allowed one', () => {
    const bounds = { min: '2026-05-10', max: '2026-05-20' }
    expect(nearestAllowed('2026-05-01', bounds)).toBe('2026-05-10')
    expect(nearestAllowed('2026-05-30', bounds)).toBe('2026-05-20')
    expect(nearestAllowed('2026-05-15', bounds)).toBe('2026-05-15')
  })

  it('highlights the days strictly between the two ends', () => {
    expect(withinRange('2026-05-15', '2026-05-10', '2026-05-20')).toBe(true)
    expect(withinRange('2026-05-10', '2026-05-10', '2026-05-20')).toBe(false)
    expect(withinRange('2026-05-20', '2026-05-10', '2026-05-20')).toBe(false)
    expect(withinRange('2026-05-25', '2026-05-10', '2026-05-20')).toBe(false)
  })
})
