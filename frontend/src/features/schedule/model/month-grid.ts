import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  endOfMonth,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import type { CalendarSpan } from './calendar-items'
import { DAYS_PER_WEEK } from './pack-lanes'

export const WEEK_STARTS_ON = 1

export type MonthDay = {
  date: Date
  key: string
  inMonth: boolean
  isWeekend: boolean
}

export type MonthWeek = {
  key: string
  days: MonthDay[]
}

export type MonthBlock = {
  key: string
  date: Date
  weeks: MonthWeek[]
}

const WEEKEND = new Set([0, 6])

export function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

export function buildMonthBlock(month: Date): MonthBlock {
  const first = startOfMonth(month)
  const last = endOfMonth(month)
  const start = startOfWeek(first, { weekStartsOn: WEEK_STARTS_ON })

  const weeks: MonthWeek[] = []
  let cursor = start

  while (cursor <= last) {
    const days: MonthDay[] = []
    for (let column = 0; column < DAYS_PER_WEEK; column += 1) {
      const date = addDays(cursor, column)
      days.push({
        date,
        key: dayKey(date),
        inMonth: isSameMonth(date, first),
        isWeekend: WEEKEND.has(date.getDay()),
      })
    }
    weeks.push({ key: dayKey(cursor), days })
    cursor = addDays(cursor, DAYS_PER_WEEK)
  }

  return { key: `${first.getFullYear()}-${first.getMonth()}`, date: first, weeks }
}

export function buildMonthBlocks(from: Date, count: number): MonthBlock[] {
  const first = startOfMonth(from)
  return Array.from({ length: Math.max(1, count) }, (_, index) =>
    buildMonthBlock(addMonths(first, index)),
  )
}

export type MonthWeekBar = {
  span: CalendarSpan
  startColumn: number
  columns: number
  lane: number
  clippedStart: boolean
  clippedEnd: boolean
}

export type MonthWeekRow = {
  bars: MonthWeekBar[]
  laneCount: number
}

export function packMonthWeek(week: MonthWeek, spans: readonly CalendarSpan[]): MonthWeekRow {
  const first = week.days[0]?.date
  const last = week.days[week.days.length - 1]?.date
  if (!first || !last) return { bars: [], laneCount: 0 }

  const weekStart = startOfDay(first)
  const weekEnd = startOfDay(last)

  const touching = spans
    .map((span) => {
      const start = startOfDay(new Date(span.row.start_at))
      const end = startOfDay(new Date(span.row.end_at))
      if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) return undefined
      if (end < weekStart || start > weekEnd) return undefined

      const startColumn = Math.max(0, differenceInCalendarDays(start, weekStart))
      const endColumn = Math.min(DAYS_PER_WEEK - 1, differenceInCalendarDays(end, weekStart))

      return {
        span,
        startColumn,
        columns: endColumn - startColumn + 1,
        lane: 0,
        clippedStart: start < weekStart,
        clippedEnd: end > weekEnd,
      }
    })
    .filter((bar): bar is MonthWeekBar => bar !== undefined)
    .sort(
      (a, b) =>
        a.startColumn - b.startColumn ||
        b.columns - a.columns ||
        a.span.id.localeCompare(b.span.id),
    )

  const lanes: number[] = []
  const bars: MonthWeekBar[] = []

  for (const bar of touching) {
    const free = lanes.findIndex((until) => bar.startColumn > until)
    const lane = free === -1 ? lanes.length : free

    lanes[lane] = bar.startColumn + bar.columns - 1
    bars.push({ ...bar, lane })
  }

  return { bars, laneCount: lanes.length }
}
