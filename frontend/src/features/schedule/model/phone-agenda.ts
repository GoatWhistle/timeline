import { addMonths, isSameDay, isWithinInterval, startOfDay, startOfMonth } from 'date-fns'
import type { CalendarSpan } from './calendar-items'
import { dayKey } from './month-grid'

export type AgendaMonth = {
  key: string
  date: Date
  spans: CalendarSpan[]
}

export function spanCovers(span: CalendarSpan, day: Date): boolean {
  const start = startOfDay(new Date(span.row.start_at))
  const end = startOfDay(new Date(span.row.end_at))
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) return false
  const target = startOfDay(day)
  if (end < start) return isSameDay(target, start)
  return isWithinInterval(target, { start, end })
}

export function spansOfDay(spans: readonly CalendarSpan[], day: Date): CalendarSpan[] {
  return spans.filter((span) => spanCovers(span, day))
}

export function countByDay(
  spans: readonly CalendarSpan[],
  days: readonly Date[],
): Map<string, number> {
  const counts = new Map<string, number>()
  for (const day of days) {
    const key = dayKey(day)
    counts.set(key, spansOfDay(spans, day).length)
  }
  return counts
}

function overlapsMonth(span: CalendarSpan, month: Date): boolean {
  const from = startOfMonth(month)
  const to = addMonths(from, 1)
  const start = startOfDay(new Date(span.row.start_at))
  const end = startOfDay(new Date(span.row.end_at))
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) return false
  return start < to && end >= from
}

export function agendaMonths(
  spans: readonly CalendarSpan[],
  from: Date,
  months: number,
): AgendaMonth[] {
  const first = startOfMonth(from)
  return Array.from({ length: Math.max(1, months) }, (_, index) => {
    const date = addMonths(first, index)
    return {
      key: `${date.getFullYear()}-${date.getMonth()}`,
      date,
      spans: spans.filter((span) => overlapsMonth(span, date)).sort(byStart),
    }
  })
}

function byStart(a: CalendarSpan, b: CalendarSpan): number {
  const left = new Date(a.row.start_at).getTime()
  const right = new Date(b.row.start_at).getTime()
  return left - right || a.row.title.localeCompare(b.row.title)
}

export const AGENDA_MAX_DOTS = 3
