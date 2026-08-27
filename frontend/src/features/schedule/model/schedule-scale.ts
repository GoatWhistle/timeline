export type TimelineScale = 'month' | 'week'

export const ROW_LABEL_WIDTH = 260
export const TICK_WIDTH: Record<TimelineScale, number> = { month: 120, week: 64 }
export const MIN_CANVAS_WIDTH = 640
export const MIN_BAR_SPAN = 4

export const BAR_HEIGHT = 20
export const LANE_STEP = 24
export const LANE_TOP = 22
export const ICON_MIN_WIDTH = 24
export const LABEL_MIN_WIDTH = 56

export function rowHeight(laneCount: number) {
  return LANE_TOP + Math.max(1, laneCount) * LANE_STEP + 6
}

export function canvasWidth(tickCount: number, scale: TimelineScale) {
  return Math.max(MIN_CANVAS_WIDTH, tickCount * TICK_WIDTH[scale])
}
