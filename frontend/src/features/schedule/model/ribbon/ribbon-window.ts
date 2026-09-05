import { addDays, differenceInCalendarDays, startOfDay, startOfMonth } from 'date-fns'

export const MINUTES_PER_HOUR = 60
export const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR

export const RIBBON_BEHIND_DAYS = 120
export const RIBBON_AHEAD_DAYS = 240
export const RIBBON_CHUNK_DAYS = 120
export const RIBBON_MAX_SPAN_DAYS = 366
export const RIBBON_PREFETCH_DAYS = 45

export type RibbonWindow = {
  start: Date
  dayCount: number
}

export function ribbonWindow(now: Date, chunk: number): RibbonWindow {
  const base = startOfMonth(now)
  const start = startOfDay(addDays(base, -RIBBON_BEHIND_DAYS + chunk * RIBBON_CHUNK_DAYS))
  return { start, dayCount: RIBBON_BEHIND_DAYS + RIBBON_AHEAD_DAYS }
}

export function windowRange(window: RibbonWindow): { from: string; to: string } {
  const span = Math.min(RIBBON_MAX_SPAN_DAYS, window.dayCount)
  return {
    from: startOfDay(window.start).toISOString(),
    to: startOfDay(addDays(window.start, span - 1)).toISOString(),
  }
}

export function dayIndexIn(window: RibbonWindow, date: Date): number {
  return differenceInCalendarDays(startOfDay(date), startOfDay(window.start))
}

export function chunkFor(visibleDay: number, chunk: number, visibleDays: number): number {
  const behind = visibleDay
  const ahead = RIBBON_BEHIND_DAYS + RIBBON_AHEAD_DAYS - (visibleDay + visibleDays)

  if (ahead < RIBBON_PREFETCH_DAYS) return chunk + 1
  if (behind < RIBBON_PREFETCH_DAYS) return chunk - 1
  return chunk
}

export function chunkShiftDays(from: number, to: number): number {
  return (to - from) * RIBBON_CHUNK_DAYS
}
