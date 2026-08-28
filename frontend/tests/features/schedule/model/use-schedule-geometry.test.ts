import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MIN_BAR_SPAN, type ScheduleScale } from '@/features/schedule/model/schedule-scale'
import {
  buildTicks,
  thinTicks,
  useScheduleGeometry,
} from '@/features/schedule/model/use-schedule-geometry'
import type { Range } from '@/features/schedule/model/zoom-range'

const FROM = new Date('2026-01-01T00:00:00Z').getTime()
const TO = new Date('2026-04-01T00:00:00Z').getTime()

function renderGeometry(range: Range = { from: FROM, to: TO }, scale: ScheduleScale = 'month') {
  return renderHook(
    ({ value, tick }: { value: Range; tick: ScheduleScale }) => useScheduleGeometry(value, tick),
    { initialProps: { value: range, tick: scale } },
  )
}

describe('useScheduleGeometry', () => {
  it('memoizes on the numeric range, so an equal but new object keeps the same scale', () => {
    const { result, rerender } = renderGeometry()
    const first = result.current

    rerender({ value: { from: FROM, to: TO }, tick: 'month' })

    expect(result.current.ticks).toBe(first.ticks)
    expect(result.current.x).toBe(first.x)
    expect(result.current.position).toBe(first.position)
  })

  it('rebuilds the scale when the range changes', () => {
    const { result, rerender } = renderGeometry()
    const first = result.current

    rerender({ value: { from: FROM, to: TO + 86_400_000 * 60 }, tick: 'month' })

    expect(result.current.ticks).not.toBe(first.ticks)
  })

  it('rebuilds the ticks when the scale changes', () => {
    const { result, rerender } = renderGeometry()
    const monthTicks = result.current.ticks.length

    rerender({ value: { from: FROM, to: TO }, tick: 'week' })

    expect(result.current.ticks.length).toBeGreaterThan(monthTicks)
  })

  it('maps the range onto the canvas width', () => {
    const { result } = renderGeometry()
    const { x, width } = result.current

    expect(x(new Date(FROM))).toBeCloseTo(0)
    expect(x(new Date(TO))).toBeCloseTo(width)
  })

  it('clamps a position to the canvas and keeps a minimum span', () => {
    const { result } = renderGeometry()
    const { position, width } = result.current

    const before = position('2025-01-01T00:00:00Z', '2025-02-01T00:00:00Z')
    expect(before.left).toBe(0)
    expect(before.width).toBe(MIN_BAR_SPAN)

    const after = position('2027-01-01T00:00:00Z', '2027-02-01T00:00:00Z')
    expect(after.left).toBe(width)

    const inside = position('2026-02-01T00:00:00Z', '2026-03-01T00:00:00Z')
    expect(inside.left).toBeGreaterThan(0)
    expect(inside.left + inside.width).toBeLessThanOrEqual(width)
  })

  it('keeps the canvas width constant while the range animates', () => {
    const { result, rerender } = renderGeometry()
    const first = result.current.width

    rerender({ value: { from: FROM + 1_000_000, to: TO - 1_000_000 }, tick: 'month' })

    expect(result.current.width).toBe(first)
  })
})

describe('buildTicks', () => {
  it('falls back to a single tick when the range is inverted', () => {
    expect(buildTicks(new Date(TO), new Date(FROM), 'month')).toHaveLength(1)
  })

  it('uses days for the week scale and months for the quarter scale', () => {
    const days = buildTicks(new Date(FROM), new Date(TO), 'week')
    const months = buildTicks(new Date(FROM), new Date(TO), 'quarter')
    expect(days.length).toBeGreaterThan(months.length)
    expect(months).toHaveLength(4)
  })
})

describe('thinTicks', () => {
  it('keeps every tick when they fit', () => {
    const ticks = buildTicks(new Date(FROM), new Date(TO), 'quarter')
    expect(thinTicks(ticks, 2000, 'quarter')).toHaveLength(ticks.length)
  })

  it('drops ticks evenly when they do not fit', () => {
    const ticks = buildTicks(new Date(FROM), new Date(TO), 'week')
    const thinned = thinTicks(ticks, 320, 'week')
    expect(thinned.length).toBeLessThan(ticks.length)
    expect(thinned[0]).toBe(ticks[0])
  })

  it('never returns an empty list', () => {
    const ticks = buildTicks(new Date(FROM), new Date(TO), 'week')
    expect(thinTicks(ticks, 1, 'week').length).toBeGreaterThan(0)
  })
})
