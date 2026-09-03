export type ScheduleScale = 'week' | 'month' | 'quarter' | 'year'

export const SCHEDULE_SCALES: ScheduleScale[] = ['week', 'month', 'quarter', 'year']

export const DEFAULT_SCALE: ScheduleScale = 'month'

export function isScheduleScale(value: unknown): value is ScheduleScale {
  return SCHEDULE_SCALES.includes(value as ScheduleScale)
}

export const SCALE_DAYS: Record<ScheduleScale, number> = {
  week: 7,
  month: 31,
  quarter: 92,
  year: 366,
}

export const DAY_WIDTH: Record<ScheduleScale, number> = {
  week: 128,
  month: 40,
  quarter: 15,
  year: 4,
}

export const MIN_DAY_WIDTH = 2
export const MAX_DAY_WIDTH = 320

export const LEGACY_BAR_HEIGHT: Record<ScheduleScale, number> = {
  week: 34,
  month: 26,
  quarter: 18,
  year: 9,
}

export const BAR_HEIGHT: Record<ScheduleScale, number> = {
  week: 78,
  month: 60,
  quarter: 44,
  year: 22,
}

export const BAR_GAP = 10
export const BAR_RADIUS = 6

export const LANE_PADDING = 12
export const MAX_LANES = 12

export const HEADER_HEIGHT = 44
export const MIN_CANVAS_HEIGHT = 260

export const MARK_SIZE = 14

export const ANNOUNCE_DELAY = 150

export const TODAY_VARIABLE = '--schedule-today-x'

export const TODAY_TICK_MS = 60_000

export function barHeightFor(scale: ScheduleScale): number {
  return BAR_HEIGHT[scale]
}

export function laneOffset(barHeight: number, lane: number): number {
  return HEADER_HEIGHT + LANE_PADDING + lane * (barHeight + BAR_GAP)
}

export function canvasHeight(barHeight: number, laneCount: number): number {
  const lanes = Math.max(1, laneCount)
  const used = laneOffset(barHeight, lanes - 1) + barHeight + LANE_PADDING
  return Math.max(MIN_CANVAS_HEIGHT, used)
}

export function fittedDayWidth(requested: number, measured: number, dayCount: number): number {
  if (measured <= 0 || dayCount <= 0) return requested
  return Math.max(requested, measured / dayCount)
}

export function clampDayWidth(width: number): number {
  return Math.min(MAX_DAY_WIDTH, Math.max(MIN_DAY_WIDTH, width))
}

export const WRAPPED_LANE_GAP = 3
export const WRAPPED_HEADER = 28
export const WRAPPED_COMPACT_HEADER = 20
export const WRAPPED_MIN_BAR = 6
export const WRAPPED_TEXT_BAR = 14
export const WRAPPED_ICON_BAR = 10
export const GRID_PADDING = 18
export const GRID_GAP = 20

export const WRAPPED_ROW_PADDING = 4

export type WrappedShape = {
  months: number
  columns: number
  minCell: number
  barHeight: number
  maxBar: number
}

export const WRAPPED_SHAPE: Record<'year' | 'quarter' | 'month', WrappedShape> = {
  year: { months: 12, columns: 4, minCell: 30, barHeight: 10, maxBar: 18 },
  quarter: { months: 3, columns: 3, minCell: 54, barHeight: 14, maxBar: 30 },
  month: { months: 1, columns: 1, minCell: 76, barHeight: 20, maxBar: 56 },
}

export function wrappedHeader(barHeight: number): number {
  return barHeight >= WRAPPED_TEXT_BAR ? WRAPPED_HEADER : WRAPPED_COMPACT_HEADER
}

export function wrappedBarHeight(
  cellHeight: number,
  preferred: number,
  laneCount: number,
  maxBar: number = preferred,
): number {
  if (laneCount <= 0) return preferred
  const usable = cellHeight - wrappedHeader(preferred) - WRAPPED_ROW_PADDING
  const perLane = (usable - (laneCount - 1) * WRAPPED_LANE_GAP) / laneCount
  const ceiling = Math.max(preferred, maxBar)
  return Math.max(WRAPPED_MIN_BAR, Math.min(ceiling, Math.floor(perLane)))
}

export function wrappedRowHeight(
  cellHeight: number,
  preferred: number,
  laneCount: number,
  maxBar: number = preferred,
): number {
  const bar = wrappedBarHeight(cellHeight, preferred, laneCount, maxBar)
  const lanes = Math.max(1, laneCount)
  const used =
    wrappedHeader(preferred) + lanes * bar + (lanes - 1) * WRAPPED_LANE_GAP + WRAPPED_ROW_PADDING
  return Math.min(cellHeight, Math.max(wrappedHeader(preferred) + preferred, used))
}

export function wrappedLaneTop(lane: number, barHeight: number, headerFor: number): number {
  return wrappedHeader(headerFor) + lane * (barHeight + WRAPPED_LANE_GAP)
}
