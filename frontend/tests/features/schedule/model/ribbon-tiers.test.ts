import { describe, expect, it } from 'vitest'
import type { CalendarSpan } from '@/features/schedule/model/calendar-items'
import {
  crossesMidnight,
  placeTimed,
  splitRibbonTiers,
} from '@/features/schedule/model/ribbon/ribbon-layout'
import type { ScheduleRow } from '@/shared/api/types.gen'

function row(start: string, end: string, id = 'e1'): ScheduleRow {
  return {
    event_id: id,
    title: 'Event',
    kind: 'HACKATHON',
    state: 'ACTIVE',
    start_at: start,
    end_at: end,
    effective_format: 'ONLINE',
    stages: [],
  }
}

function span(start: string, end: string, id = 'e1'): CalendarSpan {
  return { id, startDay: 0, endDay: 0, row: row(start, end, id), items: [], marks: [] }
}

describe('the ribbon splits its two tiers by the calendar day, not by a length in hours', () => {
  it('keeps an event that begins and ends on one day off the band', () => {
    expect(crossesMidnight(row('2026-03-04T09:00:00+03:00', '2026-03-04T23:30:00+03:00'))).toBe(
      false,
    )
  })

  it('sends a two-day event to the band even when it is shorter than a full day', () => {
    expect(crossesMidnight(row('2026-03-04T23:00:00+03:00', '2026-03-05T01:00:00+03:00'))).toBe(
      true,
    )
  })

  it('sends a week-long hackathon to the band', () => {
    expect(crossesMidnight(row('2026-03-02T10:00:00+03:00', '2026-03-09T18:00:00+03:00'))).toBe(
      true,
    )
  })

  it('routes a long meetup and a short hackathon to the tier their dates earn', () => {
    const tiers = splitRibbonTiers([
      span('2026-03-04T18:00:00+03:00', '2026-03-04T20:00:00+03:00', 'meetup'),
      span('2026-03-06T09:00:00+03:00', '2026-03-08T21:00:00+03:00', 'hack'),
    ])

    expect(tiers.timed.map((entry) => entry.id)).toEqual(['meetup'])
    expect(tiers.band.map((entry) => entry.id)).toEqual(['hack'])
  })

  it('never lets one event land in both tiers', () => {
    const spans = [
      span('2026-03-04T18:00:00+03:00', '2026-03-04T20:00:00+03:00', 'a'),
      span('2026-03-06T09:00:00+03:00', '2026-03-08T21:00:00+03:00', 'b'),
      span('2026-03-09T00:00:00+03:00', '2026-03-09T23:59:00+03:00', 'c'),
    ]
    const tiers = splitRibbonTiers(spans)

    const band = new Set(tiers.band.map((entry) => entry.id))
    const timed = new Set(tiers.timed.map((entry) => entry.id))
    expect(tiers.band.length + tiers.timed.length).toBe(spans.length)
    for (const id of band) expect(timed.has(id)).toBe(false)
  })
})

describe('a timed event sits at its own hour, not stretched across the day', () => {
  it('places an evening meetup after midday and before midnight', () => {
    const placed = placeTimed(
      [span('2026-03-04T18:30:00+03:00', '2026-03-04T20:00:00+03:00', 'meetup')],
      new Date(2026, 2, 4),
      7,
    )

    const entry = placed[0]
    expect(entry?.dayIndex).toBe(0)
    expect(entry?.startMinute).toBeGreaterThan(12 * 60)
    expect(entry?.startMinute).toBeLessThan(24 * 60)
    expect(entry?.endMinute).toBeGreaterThan(entry?.startMinute ?? 0)
  })

  it('drops an event that falls outside the window rather than clamping it to the edge', () => {
    const placed = placeTimed(
      [span('2026-05-04T18:30:00+03:00', '2026-05-04T20:00:00+03:00', 'far')],
      new Date(2026, 2, 4),
      7,
    )

    expect(placed).toEqual([])
  })

  it('gives a zero-length event a positive width so it stays clickable', () => {
    const placed = placeTimed(
      [span('2026-03-04T18:30:00+03:00', '2026-03-04T18:30:00+03:00', 'point')],
      new Date(2026, 2, 4),
      7,
    )

    const entry = placed[0]
    expect(entry?.endMinute).toBeGreaterThan(entry?.startMinute ?? 0)
  })
})
