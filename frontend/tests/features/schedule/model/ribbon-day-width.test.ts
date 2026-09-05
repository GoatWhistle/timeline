import { describe, expect, it } from 'vitest'
import {
  RIBBON_AXIS_WIDTH,
  RIBBON_DAY_MIN_WIDTH,
  RIBBON_WEEK_FRACTION,
  ribbonDayWidth,
  WEEK_COLUMNS,
} from '@/features/schedule/model/ribbon/ribbon-layout'

function weekDayWidth(viewportWidth: number): number {
  return (viewportWidth - RIBBON_AXIS_WIDTH) / WEEK_COLUMNS
}

describe('a ribbon day is half the day the week view draws', () => {
  it.each([1280, 1440, 1920, 2560])('halves the week column at %ipx', (viewport) => {
    expect(ribbonDayWidth(viewport)).toBe(Math.round(weekDayWidth(viewport) / RIBBON_WEEK_FRACTION))
  })

  it('keeps a floor so a narrow screen never collapses a day to nothing', () => {
    expect(ribbonDayWidth(320)).toBe(RIBBON_DAY_MIN_WIDTH)
    expect(ribbonDayWidth(0)).toBe(RIBBON_DAY_MIN_WIDTH)
  })

  it('grows the day as the screen grows, so the ribbon never gets denser', () => {
    const widths = [1280, 1440, 1920, 2560].map(ribbonDayWidth)
    for (const [index, width] of widths.entries()) {
      const next = widths[index + 1]
      if (next === undefined) continue
      expect(next).toBeGreaterThan(width)
    }
  })

  it('leaves a meetup room to read, unlike the 34px it had before', () => {
    expect(ribbonDayWidth(1440)).toBeGreaterThan(RIBBON_DAY_MIN_WIDTH * 2)
  })
})

describe('centring on today waits for a measured viewport', () => {
  it('would land on the wrong day if the floor width were used before measuring', () => {
    const todayIndex = 124
    const client = 1132

    const beforeMeasuring = todayIndex * ribbonDayWidth(0) - client / 2
    const afterMeasuring = todayIndex * ribbonDayWidth(client) - client / 2

    expect(beforeMeasuring).not.toBe(afterMeasuring)
    expect(afterMeasuring - beforeMeasuring).toBeGreaterThan(client)
  })

  it('reads a real width the moment the container is measured', () => {
    expect(ribbonDayWidth(0)).toBe(RIBBON_DAY_MIN_WIDTH)
    expect(ribbonDayWidth(1132)).toBeGreaterThan(RIBBON_DAY_MIN_WIDTH * 2)
  })
})
