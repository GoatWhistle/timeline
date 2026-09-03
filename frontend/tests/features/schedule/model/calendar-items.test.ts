import { describe, expect, it } from 'vitest'
import { buildCalendarSpans, marksWithin } from '@/features/schedule/model/calendar-items'
import { DEADLINE_ITEM_ID } from '@/features/schedule/model/row-items'
import { buildTimelineGrid } from '@/features/schedule/model/timeline-grid'
import type { Place, ScheduleResponse } from '@/shared/api/types.gen'

const place: Place = { format: 'ONLINE', inherited: true }

const from = new Date(2026, 0, 1)
const to = new Date(2026, 2, 1)
const grid = buildTimelineGrid(from, to)

function response(rows: ScheduleResponse['rows']): ScheduleResponse {
  return { range: { from: from.toISOString(), to: to.toISOString() }, rows }
}

const row: ScheduleResponse['rows'][number] = {
  event_id: 'e1',
  title: 'Winter Hackathon',
  kind: 'HACKATHON',
  state: 'ACTIVE',
  start_at: new Date(2026, 0, 10).toISOString(),
  end_at: new Date(2026, 0, 24).toISOString(),
  effective_format: 'ONLINE',
  registration_deadline: new Date(2026, 0, 15).toISOString(),
  stages: [
    {
      id: 'cp',
      name: 'Midpoint',
      type: 'CHECKPOINT',
      start_at: new Date(2026, 0, 20).toISOString(),
      end_at: new Date(2026, 0, 20).toISOString(),
      place,
    },
  ],
}

describe('buildCalendarSpans', () => {
  it('makes one span per event row', () => {
    const spans = buildCalendarSpans(response([row]), grid)
    expect(spans).toHaveLength(1)
    expect(spans[0]?.id).toBe('e1')
    expect(spans[0]?.row).toBe(row)
  })

  it('turns the event dates into day indices', () => {
    const [span] = buildCalendarSpans(response([row]), grid)
    expect(span?.startDay).toBe(9)
    expect(span?.endDay).toBe(23)
  })

  it('orders the ends even when the row has them reversed', () => {
    const reversed = { ...row, start_at: row.end_at, end_at: row.start_at }
    const [span] = buildCalendarSpans(response([reversed]), grid)
    expect(span?.startDay).toBeLessThanOrEqual(span?.endDay ?? -1)
  })

  it('collects the deadline and the checkpoint as marks', () => {
    const [span] = buildCalendarSpans(response([row]), grid)
    expect(span?.marks.map((mark) => mark.id).sort()).toEqual(['cp', DEADLINE_ITEM_ID])
  })

  it('pins each mark to the day it falls on', () => {
    const [span] = buildCalendarSpans(response([row]), grid)
    const byId = new Map(span?.marks.map((mark) => [mark.id, mark.dayIndex]))
    expect(byId.get(DEADLINE_ITEM_ID)).toBe(14)
    expect(byId.get('cp')).toBe(19)
  })

  it('keeps the row items alongside the span for the sentence', () => {
    const [span] = buildCalendarSpans(response([row]), grid)
    expect(span?.items.length).toBeGreaterThan(0)
  })

  it('leaves the marks empty for a row without moments', () => {
    const bare = { ...row, registration_deadline: undefined, stages: [] }
    const [span] = buildCalendarSpans(response([bare]), grid)
    expect(span?.marks).toEqual([])
  })

  it('skips a row whose dates cannot be read', () => {
    const broken = { ...row, start_at: 'nonsense' }
    expect(buildCalendarSpans(response([broken]), grid)).toEqual([])
  })

  it('drops a span lying wholly before the viewed range', () => {
    const early = {
      ...row,
      start_at: new Date(2025, 10, 1).toISOString(),
      end_at: new Date(2025, 10, 5).toISOString(),
    }
    expect(buildCalendarSpans(response([early]), grid)).toEqual([])
  })

  it('keeps a span that only reaches into the range for the packer to clip', () => {
    const overlapping = {
      ...row,
      start_at: new Date(2025, 11, 20).toISOString(),
      end_at: new Date(2026, 0, 6).toISOString(),
    }
    const [span] = buildCalendarSpans(response([overlapping]), grid)
    expect(span?.startDay).toBeLessThan(0)
    expect(span?.endDay).toBeGreaterThanOrEqual(0)
  })
})

describe('marksWithin', () => {
  it('keeps only the marks inside the given day window', () => {
    const [span] = buildCalendarSpans(response([row]), grid)
    if (!span) throw new Error('span missing')
    expect(marksWithin(span, 14, 14).map((mark) => mark.id)).toEqual([DEADLINE_ITEM_ID])
  })

  it('includes marks sitting exactly on both bounds', () => {
    const [span] = buildCalendarSpans(response([row]), grid)
    if (!span) throw new Error('span missing')
    expect(marksWithin(span, 14, 19)).toHaveLength(2)
  })

  it('returns nothing for a window holding no mark', () => {
    const [span] = buildCalendarSpans(response([row]), grid)
    if (!span) throw new Error('span missing')
    expect(marksWithin(span, 0, 5)).toEqual([])
  })
})
