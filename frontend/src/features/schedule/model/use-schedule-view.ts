import {
  addDays,
  endOfMonth,
  endOfQuarter,
  startOfDay,
  startOfMonth,
  startOfQuarter,
  subDays,
} from 'date-fns'
import { useCallback, useMemo, useState } from 'react'
import type { TimeRange } from '@/shared/api/types.gen'
import { useUrlFilters } from '@/shared/hooks/use-url-filters/use-url-filters'
import {
  clampDayWidth,
  DAY_WIDTH,
  DEFAULT_SCALE,
  isScheduleScale,
  SCALE_DAYS,
  type ScheduleScale,
  WRAPPED_SHAPE,
  type WrappedShape,
  ZOOM_STEP,
} from './schedule-scale'

export type ScheduleView = {
  scale: ScheduleScale
  dayWidth: number
  from: Date
  to: Date
  setScale: (next: ScheduleScale) => void
  goToday: () => void
  zoom: (direction: 1 | -1) => void
  setDayWidth: (next: number) => void
  canZoom: boolean
  wrapped: WrappedShape | undefined
}

const SCALE_KEY = 'scale'
const DEFAULT_SPAN_DAYS = 180

export function scaleRange(scale: ScheduleScale, apiRange: TimeRange | undefined, now: Date) {
  if (scale === 'all') {
    if (!apiRange) {
      return { from: subDays(now, DEFAULT_SPAN_DAYS), to: addDays(now, DEFAULT_SPAN_DAYS) }
    }
    return { from: new Date(apiRange.from), to: new Date(apiRange.to) }
  }

  if (scale === 'year') {
    return { from: new Date(now.getFullYear(), 0, 1), to: new Date(now.getFullYear(), 11, 31) }
  }
  if (scale === 'month') return { from: startOfMonth(now), to: endOfMonth(now) }
  if (scale === 'quarter') {
    return { from: startOfQuarter(now), to: endOfQuarter(now) }
  }
  const days = SCALE_DAYS[scale]
  return { from: startOfDay(now), to: addDays(startOfDay(now), days - 1) }
}

export function useScheduleView(apiRange: TimeRange | undefined): ScheduleView {
  const [filters, setFilters] = useUrlFilters({ [SCALE_KEY]: DEFAULT_SCALE as string })
  const scale = isScheduleScale(filters.scale) ? filters.scale : DEFAULT_SCALE

  const [anchor, setAnchor] = useState<number>(() => Date.now())
  const [zoomWidth, setZoomWidth] = useState<number>(DAY_WIDTH.all)

  const now = useMemo(() => new Date(anchor), [anchor])
  const { from, to } = useMemo(() => scaleRange(scale, apiRange, now), [scale, apiRange, now])

  const dayWidth = scale === 'all' ? zoomWidth : DAY_WIDTH[scale]

  const setScale = useCallback(
    (next: ScheduleScale) => setFilters({ [SCALE_KEY]: next }),
    [setFilters],
  )

  const goToday = useCallback(() => setAnchor(Date.now()), [])

  const setDayWidth = useCallback((next: number) => setZoomWidth(clampDayWidth(next)), [])

  const zoom = useCallback((direction: 1 | -1) => {
    setZoomWidth((previous) =>
      clampDayWidth(direction === 1 ? previous * ZOOM_STEP : previous / ZOOM_STEP),
    )
  }, [])

  return {
    scale,
    dayWidth,
    from,
    to,
    setScale,
    goToday,
    zoom,
    setDayWidth,
    canZoom: scale === 'all',
    wrapped:
      scale === 'year' || scale === 'quarter' || scale === 'month'
        ? WRAPPED_SHAPE[scale]
        : undefined,
  }
}
