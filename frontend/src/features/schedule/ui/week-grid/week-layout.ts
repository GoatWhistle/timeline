import { TZDate } from '@date-fns/tz'
import { isSameDay } from 'date-fns'
import type { ScheduleResponse } from '@/shared/api/types.gen'
import { currentTimeZone } from '@/shared/datetime/datetime'
import { buildCalendarSpans, type CalendarSpan } from '../../model/calendar-items'
import { type PackedTimed, packDayColumns } from '../../model/pack-lanes'
import type { TimelineGrid } from '../../model/timeline-grid'

export const WEEK_AXIS_WIDTH = 76
export const WEEK_HOUR_HEIGHT = 52
export const WEEK_BAND_BAR = 26
export const WEEK_BAND_GAP = 4
export const MINUTES_PER_HOUR = 60
export const WEEK_BODY_MAX_HEIGHT = 720
export const WEEK_LABEL_CLEARANCE = 10

export function zoned(value: Date | string): Date {
  return new TZDate(typeof value === 'string' ? new Date(value) : value, currentTimeZone())
}

export function minutesOfDay(value: Date | string): number {
  const date = zoned(value)
  return date.getHours() * MINUTES_PER_HOUR + date.getMinutes()
}

export function buildWeekBand(data: ScheduleResponse, grid: TimelineGrid): CalendarSpan[] {
  return buildCalendarSpans(data, grid)
}

export type TimedEntry = {
  id: string
  span: CalendarSpan
  startMinute: number
  endMinute: number
}

export type DayColumn = {
  day: Date
  entries: TimedEntry[]
  packed: PackedTimed<TimedEntry>[]
}

const DAY_MINUTES = 24 * MINUTES_PER_HOUR

export function entriesForDay(spans: readonly CalendarSpan[], day: Date): TimedEntry[] {
  const target = zoned(day)
  const entries: TimedEntry[] = []

  for (const span of spans) {
    const start = zoned(span.row.start_at)
    const end = zoned(span.row.end_at)
    const startsHere = isSameDay(start, target)
    const endsHere = isSameDay(end, target)
    if (!startsHere && !endsHere) continue

    const startMinute = startsHere ? minutesOfDay(start) : 0
    const endMinute = endsHere ? minutesOfDay(end) : DAY_MINUTES
    if (endMinute <= startMinute) continue

    entries.push({ id: span.id, span, startMinute, endMinute })
  }

  return entries
}

export function buildDayColumns(
  spans: readonly CalendarSpan[],
  days: readonly Date[],
): DayColumn[] {
  return days.map((day) => {
    const entries = entriesForDay(spans, day)
    return { day, entries, packed: packDayColumns(entries) }
  })
}

export function bandLaneCount(packedLanes: readonly { lane: number }[]): number {
  return packedLanes.reduce((max, bar) => Math.max(max, bar.lane + 1), 0)
}

export const WEEK_BAND_MAX_LANES = 5

export function bandHeight(laneCount: number): number {
  const lanes = Math.max(1, laneCount)
  return lanes * WEEK_BAND_BAR + (lanes - 1) * WEEK_BAND_GAP + WEEK_BAND_GAP * 2
}

export function bandViewportHeight(laneCount: number): number {
  return bandHeight(Math.min(Math.max(1, laneCount), WEEK_BAND_MAX_LANES))
}

export function timedTop(startMinute: number, startHour: number): number {
  return ((startMinute - startHour * MINUTES_PER_HOUR) / MINUTES_PER_HOUR) * WEEK_HOUR_HEIGHT
}

export function timedHeight(startMinute: number, endMinute: number): number {
  return ((endMinute - startMinute) / MINUTES_PER_HOUR) * WEEK_HOUR_HEIGHT
}
