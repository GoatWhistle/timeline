import { DAYS_PER_WEEK } from './pack-lanes'

export type ScheduleScale = 'week' | 'month' | 'quarter' | 'year' | 'all'

export const SCHEDULE_SCALES: ScheduleScale[] = ['week', 'month', 'quarter', 'year', 'all']

export const DEFAULT_SCALE: ScheduleScale = 'month'

export function isScheduleScale(value: unknown): value is ScheduleScale {
  return SCHEDULE_SCALES.includes(value as ScheduleScale)
}

export const ANNOUNCE_DELAY = 150

export const WRAPPED_LANE_GAP = 3
export const WRAPPED_HEADER = 28
export const WRAPPED_COMPACT_HEADER = 20
export const WRAPPED_MIN_BAR = 6
export const WRAPPED_TEXT_BAR = 14
export const WRAPPED_ICON_BAR = 10
export const GRID_PADDING = 18
export const GRID_GAP = 20

export const WRAPPED_ROW_PADDING = 4

export const TOUCH_CELL = 44

export function touchColumns(preferred: number, width: number, touch: boolean): number {
  if (!touch || width <= 0) return preferred
  for (let columns = preferred; columns > 1; columns -= 1) {
    const available = width - GRID_PADDING * 2 - GRID_GAP * (columns - 1)
    if (available / (columns * DAYS_PER_WEEK) >= TOUCH_CELL) return columns
  }
  return 1
}

export type WrappedShape = {
  months: number
  columns: number
  minCell: number
  barHeight: number
  maxBar: number
}

export const WRAPPED_SHAPE: Record<'year' | 'quarter' | 'month', WrappedShape> = {
  year: { months: 12, columns: 4, minCell: 74, barHeight: 16, maxBar: 26 },
  quarter: { months: 3, columns: 3, minCell: 118, barHeight: 20, maxBar: 44 },
  month: { months: 1, columns: 1, minCell: 130, barHeight: 24, maxBar: 64 },
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
