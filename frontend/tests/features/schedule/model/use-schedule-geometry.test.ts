import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MIN_BAR_SPAN, type TimelineScale } from '@/features/schedule/model/schedule-scale'
import { useScheduleGeometry } from '@/features/schedule/model/use-schedule-geometry'

const FROM = '2026-01-01T00:00:00Z'
const TO = '2026-04-01T00:00:00Z'

function renderGeometry(from = FROM, to = TO, scale: TimelineScale = 'month') {
  return renderHook(
    ({ fromIso, toIso, tick }: { fromIso: string; toIso: string; tick: TimelineScale }) =>
      useScheduleGeometry(fromIso, toIso, tick),
    { initialProps: { fromIso: from, toIso: to, tick: scale } },
  )
}

describe('useScheduleGeometry', () => {
  it('memoizes on ISO strings, so a re-render with equal input keeps the same objects', () => {
    const { result, rerender } = renderGeometry()
    const first = result.current

    rerender({ fromIso: FROM, toIso: TO, tick: 'month' })

    expect(result.current.ticks).toBe(first.ticks)
    expect(result.current.x).toBe(first.x)
    expect(result.current.position).toBe(first.position)
  })

  it('keeps the memo across re-renders with newly built but equal ISO strings', () => {
    const { result, rerender } = renderGeometry()
    const first = result.current

    rerender({ fromIso: `${FROM.slice(0, -1)}Z`, toIso: `${TO.slice(0, -1)}Z`, tick: 'month' })

    expect(result.current.ticks).toBe(first.ticks)
    expect(result.current.x).toBe(first.x)
  })

  it('rebuilds the scale when the range changes', () => {
    const { result, rerender } = renderGeometry()
    const first = result.current

    rerender({ fromIso: FROM, toIso: '2026-06-01T00:00:00Z', tick: 'month' })

    expect(result.current.ticks).not.toBe(first.ticks)
    expect(result.current.ticks.length).toBeGreaterThan(first.ticks.length)
  })

  it('rebuilds the ticks when the scale changes', () => {
    const { result, rerender } = renderGeometry()
    const monthTicks = result.current.ticks.length

    rerender({ fromIso: FROM, toIso: TO, tick: 'week' })

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

  it('falls back to a single tick when the range is inverted', () => {
    const { result } = renderGeometry(TO, FROM)
    expect(result.current.ticks).toHaveLength(1)
  })
})
