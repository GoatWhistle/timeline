import { TZDate } from '@date-fns/tz'
import { differenceInCalendarDays, isSameDay, startOfDay } from 'date-fns'
import type { ScheduleRow } from '@/shared/api/types.gen'
import { currentTimeZone } from '@/shared/datetime/datetime'
import { WEEK_AXIS_WIDTH, WEEK_HOUR_HEIGHT } from '../../ui/week-grid/week-layout'
import type { CalendarSpan } from '../calendar-items'
import { GRID_HOUR_END, GRID_HOUR_START } from '../pack-lanes'
import { MINUTES_PER_DAY, MINUTES_PER_HOUR } from './ribbon-window'

export const RIBBON_DAY_MIN_WIDTH = 34

export const WEEK_COLUMNS = 7

export const RIBBON_WEEK_FRACTION = 2

export const RIBBON_BAND_BAR = 22
export const RIBBON_BAND_GAP = 4
export const RIBBON_BAND_MAX_LANES = 6
export const RIBBON_HOUR_START = GRID_HOUR_START
export const RIBBON_HOUR_END = GRID_HOUR_END
export const RIBBON_HOUR_HEIGHT = WEEK_HOUR_HEIGHT
export const RIBBON_AXIS_WIDTH = WEEK_AXIS_WIDTH
export const RIBBON_MONTH_RULE = 26
export const RIBBON_DAY_RULE = 22
export const RIBBON_DENSITY_TRACK = 34
export const RIBBON_MIN_TIMED_WIDTH = 10

export function ribbonDayWidth(viewportWidth: number): number {
  if (viewportWidth <= 0) return RIBBON_DAY_MIN_WIDTH
  const weekDay = (viewportWidth - RIBBON_AXIS_WIDTH) / WEEK_COLUMNS
  return Math.max(RIBBON_DAY_MIN_WIDTH, Math.round(weekDay / RIBBON_WEEK_FRACTION))
}

export function ribbonZoned(value: Date | string): Date {
  return new TZDate(typeof value === 'string' ? new Date(value) : value, currentTimeZone())
}

export function crossesMidnight(row: ScheduleRow): boolean {
  const start = ribbonZoned(row.start_at)
  const end = ribbonZoned(row.end_at)
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) return true
  return !isSameDay(start, end)
}

export function splitRibbonTiers(spans: readonly CalendarSpan[]): {
  band: CalendarSpan[]
  timed: CalendarSpan[]
} {
  const band: CalendarSpan[] = []
  const timed: CalendarSpan[] = []
  for (const span of spans) {
    if (crossesMidnight(span.row)) band.push(span)
    else timed.push(span)
  }
  return { band, timed }
}

export function minutesOfDay(value: Date | string): number {
  const date = ribbonZoned(value)
  return date.getHours() * MINUTES_PER_HOUR + date.getMinutes()
}

export type TimedPlacement = {
  id: string
  span: CalendarSpan
  dayIndex: number
  startMinute: number
  endMinute: number
}

export function placeTimed(
  spans: readonly CalendarSpan[],
  start: Date,
  dayCount: number,
): TimedPlacement[] {
  const anchor = startOfDay(start)
  const placed: TimedPlacement[] = []

  for (const span of spans) {
    const from = ribbonZoned(span.row.start_at)
    const dayIndex = differenceInCalendarDays(startOfDay(from), anchor)
    if (dayIndex < 0 || dayIndex >= dayCount) continue

    const startMinute = minutesOfDay(from)
    const endMinute = Math.min(
      MINUTES_PER_DAY,
      Math.max(startMinute + 1, minutesOfDay(span.row.end_at)),
    )

    placed.push({ id: span.id, span, dayIndex, startMinute, endMinute })
  }

  return placed.sort(
    (a, b) => a.dayIndex - b.dayIndex || a.startMinute - b.startMinute || a.id.localeCompare(b.id),
  )
}

export function dayOffset(dayIndex: number, dayWidth: number): number {
  return dayIndex * dayWidth
}

export function minuteOffset(dayIndex: number, minute: number, dayWidth: number): number {
  return dayIndex * dayWidth + (minute / MINUTES_PER_DAY) * dayWidth
}

export function bandTrackHeight(laneCount: number): number {
  const lanes = Math.max(1, Math.min(laneCount, RIBBON_BAND_MAX_LANES))
  return lanes * RIBBON_BAND_BAR + (lanes - 1) * RIBBON_BAND_GAP + RIBBON_BAND_GAP * 2
}

export function bandLaneTop(lane: number): number {
  return RIBBON_BAND_GAP + lane * (RIBBON_BAND_BAR + RIBBON_BAND_GAP)
}

export function timedBarTop(startMinute: number): number {
  const from = clampToHourWindow(startMinute)
  return ((from - RIBBON_HOUR_START * MINUTES_PER_HOUR) / MINUTES_PER_HOUR) * RIBBON_HOUR_HEIGHT
}

export function timedBarHeight(startMinute: number, endMinute: number): number {
  const from = clampToHourWindow(startMinute)
  const to = clampToHourWindow(Math.max(endMinute, startMinute))
  const span = ((to - from) / MINUTES_PER_HOUR) * RIBBON_HOUR_HEIGHT
  return Math.max(RIBBON_MIN_TIMED_WIDTH, span)
}

export function hourLineTop(hour: number): number {
  return (hour - RIBBON_HOUR_START) * RIBBON_HOUR_HEIGHT
}

export function ribbonHours(): number[] {
  return Array.from(
    { length: RIBBON_HOUR_END - RIBBON_HOUR_START + 1 },
    (_, index) => RIBBON_HOUR_START + index,
  )
}

export function hourTrackHeight(placements: readonly TimedPlacement[]): number {
  return placements.length === 0 ? 0 : ribbonHours().length * RIBBON_HOUR_HEIGHT
}

export function clampToHourWindow(minute: number): number {
  return Math.min(
    RIBBON_HOUR_END * MINUTES_PER_HOUR,
    Math.max(RIBBON_HOUR_START * MINUTES_PER_HOUR, minute),
  )
}

export function timedClippedStart(startMinute: number): boolean {
  return startMinute < RIBBON_HOUR_START * MINUTES_PER_HOUR
}

export function timedClippedEnd(endMinute: number): boolean {
  return endMinute > RIBBON_HOUR_END * MINUTES_PER_HOUR
}

export function densityByDay(
  band: readonly CalendarSpan[],
  timed: readonly TimedPlacement[],
  dayCount: number,
): number[] {
  const counts = new Array<number>(Math.max(0, dayCount)).fill(0)

  for (const span of band) {
    const from = Math.max(0, span.startDay)
    const to = Math.min(dayCount - 1, span.endDay)
    for (let day = from; day <= to; day += 1) counts[day] = (counts[day] ?? 0) + 1
  }

  for (const entry of timed) {
    if (entry.dayIndex < 0 || entry.dayIndex >= dayCount) continue
    counts[entry.dayIndex] = (counts[entry.dayIndex] ?? 0) + 1
  }

  return counts
}

export function densityPeak(counts: readonly number[]): number {
  return counts.reduce((peak, count) => Math.max(peak, count), 0)
}
