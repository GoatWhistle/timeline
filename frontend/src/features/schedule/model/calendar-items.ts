import type { ScheduleResponse, ScheduleRow } from '@/shared/api/types.gen'
import type { SpanInput } from './pack-lanes'
import { buildRowItems, type MomentItem, type RowItem } from './row-items'
import type { TimelineGrid } from './timeline-grid'
import { dayIndexOf } from './timeline-grid'

export type CalendarMark = {
  id: string
  moment: MomentItem
  dayIndex: number
}

export type CalendarSpan = SpanInput & {
  row: ScheduleRow
  items: RowItem[]
  marks: CalendarMark[]
}

export function buildCalendarSpans(data: ScheduleResponse, grid: TimelineGrid): CalendarSpan[] {
  const spans: CalendarSpan[] = []

  for (const row of data.rows) {
    const startDay = dayIndexOf(grid, row.start_at)
    const endDay = dayIndexOf(grid, row.end_at)
    if (!Number.isFinite(startDay) || !Number.isFinite(endDay)) continue

    const from = Math.min(startDay, endDay)
    const to = Math.max(startDay, endDay)
    if (to < 0 || from > grid.dayCount - 1) continue

    const items = buildRowItems(row)
    const marks: CalendarMark[] = []

    for (const item of items) {
      if (item.kind !== 'moment') continue
      const at = dayIndexOf(grid, item.at)
      if (!Number.isFinite(at)) continue
      marks.push({ id: item.id, moment: item, dayIndex: at })
    }

    spans.push({ id: row.event_id, startDay: from, endDay: to, row, items, marks })
  }

  return spans
}

export function marksWithin(span: CalendarSpan, startDay: number, endDay: number): CalendarMark[] {
  return span.marks.filter((mark) => mark.dayIndex >= startDay && mark.dayIndex <= endDay)
}

export const ALL_DAY_MINUTES = 20 * 60

export function isAllDaySpan(row: ScheduleRow): boolean {
  const start = new Date(row.start_at).getTime()
  const end = new Date(row.end_at).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end)) return true
  return (end - start) / 60_000 >= ALL_DAY_MINUTES
}

export function splitByZone(spans: readonly CalendarSpan[]): {
  allDay: CalendarSpan[]
  timed: CalendarSpan[]
} {
  const allDay: CalendarSpan[] = []
  const timed: CalendarSpan[] = []
  for (const span of spans) {
    if (isAllDaySpan(span.row)) allDay.push(span)
    else timed.push(span)
  }
  return { allDay, timed }
}
