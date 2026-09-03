import { addDays, differenceInCalendarDays, isSameDay, startOfDay } from 'date-fns'

export type TimelineDay = {
  date: Date
  index: number
  isFirstOfMonth: boolean
  isWeekend: boolean
}

export type TimelineMonth = {
  key: string
  date: Date
  startIndex: number
  dayCount: number
}

export type TimelineGrid = {
  start: Date
  end: Date
  days: TimelineDay[]
  months: TimelineMonth[]
  dayCount: number
}

const WEEKEND_DAYS = new Set([0, 6])
export const MAX_GRID_DAYS = 1200

export function buildTimelineGrid(from: Date, to: Date): TimelineGrid {
  const start = startOfDay(from)
  const rawSpan = differenceInCalendarDays(startOfDay(to), start) + 1
  const dayCount = Math.min(MAX_GRID_DAYS, Math.max(1, rawSpan))

  const days: TimelineDay[] = []
  const months: TimelineMonth[] = []

  for (let index = 0; index < dayCount; index += 1) {
    const date = addDays(start, index)
    days.push({
      date,
      index,
      isFirstOfMonth: date.getDate() === 1,
      isWeekend: WEEKEND_DAYS.has(date.getDay()),
    })

    const key = `${date.getFullYear()}-${date.getMonth()}`
    const last = months[months.length - 1]
    if (last && last.key === key) last.dayCount += 1
    else months.push({ key, date, startIndex: index, dayCount: 1 })
  }

  return { start, end: addDays(start, dayCount - 1), days, months, dayCount }
}

export function dayIndex(grid: TimelineGrid, date: Date): number {
  return differenceInCalendarDays(startOfDay(date), grid.start)
}

export function dayIndexOf(grid: TimelineGrid, iso: string): number {
  const date = new Date(iso)
  if (!Number.isFinite(date.getTime())) return Number.NaN
  return dayIndex(grid, date)
}

export function isToday(date: Date, now: Date): boolean {
  return isSameDay(date, now)
}
