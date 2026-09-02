export type ScheduleScale = 'week' | 'month' | 'quarter'

export const SCHEDULE_SCALES: ScheduleScale[] = ['week', 'month', 'quarter']

export const DEFAULT_SCALE: ScheduleScale = 'month'

export function isScheduleScale(value: unknown): value is ScheduleScale {
  return SCHEDULE_SCALES.includes(value as ScheduleScale)
}

export const SCALE_WEEKS: Record<ScheduleScale, number> = { week: 1, month: 6, quarter: 14 }

export const LEGACY_BAR_HEIGHT: Record<ScheduleScale, number> = { week: 34, month: 26, quarter: 18 }

export const BAR_HEIGHT: Record<ScheduleScale, number> = { week: 78, month: 60, quarter: 40 }
export const BAR_GAP = 4
export const BAR_RADIUS = 6

export const DAY_HEADER_HEIGHT = 22
export const WEEK_MIN_HEIGHT: Record<ScheduleScale, number> = {
  week: 260,
  month: 148,
  quarter: 96,
}

export const MAX_LANES: Record<ScheduleScale, number> = { week: 8, month: 3, quarter: 2 }

export const MARK_SIZE = 14

export const ANNOUNCE_DELAY = 150

export const TODAY_VARIABLE = '--schedule-today-x'

export const TODAY_TICK_MS: Record<ScheduleScale, number> = {
  week: 15_000,
  month: 60_000,
  quarter: 300_000,
}

export function weekHeight(scale: ScheduleScale, laneCount: number, hasOverflow: boolean): number {
  const lanes = Math.max(1, laneCount)
  const bars = lanes * (BAR_HEIGHT[scale] + BAR_GAP) + (hasOverflow ? 18 : 0)
  return Math.max(WEEK_MIN_HEIGHT[scale], DAY_HEADER_HEIGHT + bars + BAR_GAP)
}

export function laneOffset(scale: ScheduleScale, lane: number): number {
  return DAY_HEADER_HEIGHT + lane * (BAR_HEIGHT[scale] + BAR_GAP)
}
