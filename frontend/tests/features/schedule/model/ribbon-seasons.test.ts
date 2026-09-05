import { describe, expect, it } from 'vitest'
import { seasonBands, seasonOf, seasonYear } from '@/features/schedule/model/ribbon/ribbon-season'
import {
  chunkFor,
  RIBBON_AHEAD_DAYS,
  RIBBON_BEHIND_DAYS,
  RIBBON_MAX_SPAN_DAYS,
  ribbonWindow,
  windowRange,
} from '@/features/schedule/model/ribbon/ribbon-window'

describe('the ribbon colours its ground by the season the days belong to', () => {
  it('names each season by its months', () => {
    expect(seasonOf(new Date(2026, 0, 15))).toBe('winter')
    expect(seasonOf(new Date(2026, 3, 15))).toBe('spring')
    expect(seasonOf(new Date(2026, 6, 15))).toBe('summer')
    expect(seasonOf(new Date(2026, 9, 15))).toBe('autumn')
  })

  it('counts December towards the winter that ends in the next year', () => {
    expect(seasonYear(new Date(2026, 11, 20))).toBe(2027)
    expect(seasonYear(new Date(2027, 0, 20))).toBe(2027)
  })

  it('runs one unbroken band per season rather than one per day', () => {
    const bands = seasonBands(new Date(2026, 0, 1), 365)

    expect(bands.length).toBeGreaterThan(3)
    expect(bands.length).toBeLessThan(8)
    for (const band of bands) expect(band.dayCount).toBeGreaterThan(1)
  })

  it('covers every day of the window exactly once, leaving no gap', () => {
    const dayCount = 400
    const bands = seasonBands(new Date(2026, 1, 10), dayCount)

    expect(bands[0]?.startDay).toBe(0)
    let expected = 0
    for (const band of bands) {
      expect(band.startDay).toBe(expected)
      expected += band.dayCount
    }
    expect(expected).toBe(dayCount)
  })

  it('changes season between two bands that touch', () => {
    const bands = seasonBands(new Date(2026, 0, 1), 365)

    for (let index = 1; index < bands.length; index += 1) {
      const previous = bands[index - 1]
      const current = bands[index]
      expect(`${current?.season}-${current?.year}`).not.toBe(
        `${previous?.season}-${previous?.year}`,
      )
    }
  })
})

describe('the window the ribbon asks for stays inside what the API allows', () => {
  it('never asks for more days than the contract caps at', () => {
    for (const chunk of [-3, -1, 0, 1, 5]) {
      const range = windowRange(ribbonWindow(new Date(2026, 2, 4), chunk))
      const days = (new Date(range.to).getTime() - new Date(range.from).getTime()) / 86_400_000 + 1
      expect(days).toBeLessThanOrEqual(RIBBON_MAX_SPAN_DAYS)
    }
  })

  it('reaches behind the present as well as ahead of it', () => {
    const window = ribbonWindow(new Date(2026, 2, 4), 0)

    expect(window.dayCount).toBe(RIBBON_BEHIND_DAYS + RIBBON_AHEAD_DAYS)
    expect(window.start.getTime()).toBeLessThan(new Date(2026, 2, 4).getTime())
  })

  it('moves the window forward before the reader reaches the far edge', () => {
    const visible = 30
    const nearEnd = RIBBON_BEHIND_DAYS + RIBBON_AHEAD_DAYS - visible - 5

    expect(chunkFor(nearEnd, 0, visible)).toBe(1)
  })

  it('moves the window back before the reader reaches the near edge', () => {
    expect(chunkFor(5, 0, 30)).toBe(-1)
  })

  it('leaves the window alone in the middle', () => {
    expect(chunkFor(RIBBON_BEHIND_DAYS, 0, 30)).toBe(0)
  })

  it('steps one chunk at a time so the ribbon never jumps a year at once', () => {
    const visible = 30
    const nearEnd = RIBBON_BEHIND_DAYS + RIBBON_AHEAD_DAYS - visible - 5

    expect(Math.abs(chunkFor(nearEnd, 4, visible) - 4)).toBe(1)
  })
})
