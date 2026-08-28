export type ScheduleScale = 'week' | 'month' | 'quarter'

export const SCHEDULE_SCALES: ScheduleScale[] = ['week', 'month', 'quarter']

export const DEFAULT_SCALE: ScheduleScale = 'month'

export function isScheduleScale(value: unknown): value is ScheduleScale {
  return SCHEDULE_SCALES.includes(value as ScheduleScale)
}

export const ROW_LABEL_WIDTH = 260
export const NARROW_LABEL_WIDTH = 148
export const TICK_WIDTH: Record<ScheduleScale, number> = { week: 160, month: 120, quarter: 72 }
export const CANVAS_WIDTH: Record<ScheduleScale, number> = {
  week: 1400,
  month: 1560,
  quarter: 1800,
}
export const MIN_CANVAS_WIDTH = 640
export const MIN_BAR_SPAN = 4

export const BAR_HEIGHT = 30
export const BAR_RADIUS = 3
export const ROW_PITCH = 48
export const LANE_STEP = ROW_PITCH
export const LANE_TOP = (ROW_PITCH - BAR_HEIGHT) / 2
export const ROW_PADDING = LANE_TOP

export const DIAMOND_SIZE = 11
export const DIAMOND_HIT = 20
export const TODAY_DOT_SIZE = 6

export const ICON_MIN_WIDTH = 24
export const LABEL_MIN_WIDTH = 56
export const PLACE_MIN_WIDTH = 120
export const LABEL_OUTSIDE_GAP = 5

export const LABEL_ABOVE_BREAKPOINT = 760

export const ANNOUNCE_DELAY = 150

export const TODAY_VARIABLE = '--schedule-today-x'

export const TODAY_TICK_MS: Record<ScheduleScale, number> = {
  week: 15_000,
  month: 60_000,
  quarter: 300_000,
}

export function rowHeight(laneCount: number) {
  return Math.max(1, laneCount) * ROW_PITCH
}

export function laneTop(lane: number) {
  return LANE_TOP + lane * LANE_STEP
}

export function canvasWidth(scale: ScheduleScale, available = 0) {
  return Math.max(MIN_CANVAS_WIDTH, CANVAS_WIDTH[scale], available)
}
