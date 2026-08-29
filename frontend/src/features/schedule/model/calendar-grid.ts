import { addDays, differenceInCalendarDays, startOfDay, startOfWeek } from 'date-fns'
import { DAYS_PER_WEEK } from './pack-lanes'

export type CalendarDay = {
  date: Date
  index: number
  inRange: boolean
  isFirstOfMonth: boolean
}

export type CalendarWeek = {
  index: number
  days: CalendarDay[]
}

export type CalendarGrid = {
  start: Date
  weeks: CalendarWeek[]
  dayCount: number
  weekCount: number
}

export const WEEK_STARTS_ON = 1

export function gridStart(from: Date): Date {
  return startOfWeek(startOfDay(from), { weekStartsOn: WEEK_STARTS_ON })
}

export function buildCalendarGrid(from: Date, to: Date): CalendarGrid {
  const start = gridStart(from)
  const spanDays = Math.max(0, differenceInCalendarDays(startOfDay(to), start))
  const weekCount = Math.max(1, Math.ceil((spanDays + 1) / DAYS_PER_WEEK))
  const rangeStart = startOfDay(from)
  const rangeEnd = startOfDay(to)

  const weeks: CalendarWeek[] = []
  for (let week = 0; week < weekCount; week += 1) {
    const days: CalendarDay[] = []
    for (let column = 0; column < DAYS_PER_WEEK; column += 1) {
      const index = week * DAYS_PER_WEEK + column
      const date = addDays(start, index)
      days.push({
        date,
        index,
        inRange: date >= rangeStart && date <= rangeEnd,
        isFirstOfMonth: date.getDate() === 1,
      })
    }
    weeks.push({ index: week, days })
  }

  return { start, weeks, dayCount: weekCount * DAYS_PER_WEEK, weekCount }
}

export function dayIndex(grid: CalendarGrid, date: Date): number {
  return differenceInCalendarDays(startOfDay(date), grid.start)
}

export function dayIndexOf(grid: CalendarGrid, iso: string): number {
  const date = new Date(iso)
  if (!Number.isFinite(date.getTime())) return Number.NaN
  return dayIndex(grid, date)
}
