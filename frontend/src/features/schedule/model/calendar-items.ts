import type { ScheduleResponse, ScheduleRow } from '@/shared/api/types.gen'
import type { CalendarGrid } from './calendar-grid'
import { dayIndexOf } from './calendar-grid'
import type { SpanInput } from './pack-lanes'
import { buildRowItems, type MomentItem, type RowItem } from './row-items'

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

export function buildCalendarSpans(data: ScheduleResponse, grid: CalendarGrid): CalendarSpan[] {
  const spans: CalendarSpan[] = []

  for (const row of data.rows) {
    const startDay = dayIndexOf(grid, row.start_at)
    const endDay = dayIndexOf(grid, row.end_at)
    if (!Number.isFinite(startDay) || !Number.isFinite(endDay)) continue

    const items = buildRowItems(row)
    const marks: CalendarMark[] = []

    for (const item of items) {
      if (item.kind !== 'moment') continue
      const at = dayIndexOf(grid, item.at)
      if (!Number.isFinite(at)) continue
      marks.push({ id: item.id, moment: item, dayIndex: at })
    }

    spans.push({
      id: row.event_id,
      startDay: Math.min(startDay, endDay),
      endDay: Math.max(startDay, endDay),
      row,
      items,
      marks,
    })
  }

  return spans
}

export function marksWithin(span: CalendarSpan, startDay: number, endDay: number): CalendarMark[] {
  return span.marks.filter((mark) => mark.dayIndex >= startDay && mark.dayIndex <= endDay)
}
