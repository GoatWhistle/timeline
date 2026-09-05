import { DAYS_PER_WEEK } from './pack-lanes'

export const PHONE_CELL_MIN = 56

export const PHONE_CELL_MAX = 108

export const PHONE_CELL_RATIO = 1.9

export const PHONE_GRID_GAP = 0

export const PHONE_MONTH_PADDING = 8

export const PHONE_MONTH_CHROME = 96

export function phoneCellFromWidth(width: number): number {
  if (width <= 0) return PHONE_CELL_MIN
  const inner = width - PHONE_MONTH_PADDING * 2 - PHONE_GRID_GAP * (DAYS_PER_WEEK - 1)
  return Math.floor((inner / DAYS_PER_WEEK) * PHONE_CELL_RATIO)
}

export function phoneCellFromHeight(height: number, rows: number): number {
  if (height <= 0 || rows <= 0) return PHONE_CELL_MIN
  const inner = height - PHONE_MONTH_CHROME - PHONE_GRID_GAP * (rows - 1)
  return Math.floor(inner / rows)
}

export function phoneDayCell(width: number, height = 0, rows = 0): number {
  const roomy = height > 0 && rows > 0 ? phoneCellFromHeight(height, rows) : PHONE_CELL_MAX
  const wanted = Math.min(roomy, PHONE_CELL_MAX)
  return Math.max(PHONE_CELL_MIN, Math.min(phoneCellFromWidth(width), wanted))
}
