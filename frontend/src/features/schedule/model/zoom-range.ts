import { SCALE_WEEKS, type ScheduleScale } from './schedule-scale'

export type Range = { from: number; to: number }

const DAY_MS = 86_400_000

const SCALE_SPAN_DAYS: Record<ScheduleScale, number> = {
  week: SCALE_WEEKS.week * 7,
  month: SCALE_WEEKS.month * 7,
  quarter: SCALE_WEEKS.quarter * 7,
}

export const MIN_SPAN_MS = DAY_MS
const RANGE_PADDING = 0.08

export function spanOf(range: Range): number {
  return Math.max(MIN_SPAN_MS, range.to - range.from)
}

export function centerOf(range: Range): number {
  return range.from + (range.to - range.from) / 2
}

export function rangeAround(center: number, spanMs: number): Range {
  const span = Math.max(MIN_SPAN_MS, spanMs)
  return { from: center - span / 2, to: center + span / 2 }
}

export function scaleSpanMs(scale: ScheduleScale): number {
  return SCALE_SPAN_DAYS[scale] * DAY_MS
}

export function clampToBounds(range: Range, bounds: Range): Range {
  const span = spanOf(range)
  const available = spanOf(bounds)
  if (span >= available) return { from: bounds.from, to: bounds.from + span }
  if (range.from < bounds.from) return { from: bounds.from, to: bounds.from + span }
  if (range.to > bounds.to) return { from: bounds.to - span, to: bounds.to }
  return range
}

export function padRange(range: Range, fraction: number = RANGE_PADDING): Range {
  const pad = spanOf(range) * fraction
  return { from: range.from - pad, to: range.to + pad }
}

export function interpolateRange(from: Range, to: Range, progress: number): Range {
  const t = Math.min(1, Math.max(0, progress))
  const fromSpan = spanOf(from)
  const toSpan = spanOf(to)
  const span = fromSpan * (toSpan / fromSpan) ** t
  const center = centerOf(from) + (centerOf(to) - centerOf(from)) * t
  return rangeAround(center, span)
}

export function scaleForSpan(spanMs: number): ScheduleScale {
  const days = spanMs / DAY_MS
  const week = SCALE_SPAN_DAYS.week
  const month = SCALE_SPAN_DAYS.month
  if (days <= Math.sqrt(week * month)) return 'week'
  if (days <= Math.sqrt(month * SCALE_SPAN_DAYS.quarter)) return 'month'
  return 'quarter'
}

export function easeZoom(progress: number): number {
  const t = Math.min(1, Math.max(0, progress))
  return 1 - (1 - t) ** 3
}
