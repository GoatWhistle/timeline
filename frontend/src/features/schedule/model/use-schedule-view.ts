import { useCallback, useEffect, useMemo, useState } from 'react'
import type { TimeRange } from '@/shared/api/types.gen'
import { useUrlFilters } from '@/shared/hooks/use-url-filters/use-url-filters'
import {
  DEFAULT_SCALE,
  isScheduleScale,
  SCHEDULE_SCALES,
  type ScheduleScale,
} from './schedule-scale'
import { useZoomRange } from './use-zoom-range'
import { centerOf, padRange, type Range } from './zoom-range'

export type ScheduleView = {
  scale: ScheduleScale
  range: Range
  bounds: Range
  viewportWidth: number
  setScale: (next: ScheduleScale) => void
  goToday: () => void
  zoom: (direction: 1 | -1) => void
}

const SCALE_KEY = 'scale'

export function useScheduleView(apiRange: TimeRange | undefined): ScheduleView {
  const [filters, setFilters] = useUrlFilters({ [SCALE_KEY]: DEFAULT_SCALE as string })
  const scale = isScheduleScale(filters.scale) ? filters.scale : DEFAULT_SCALE

  const bounds = useMemo<Range>(() => {
    if (!apiRange) {
      const now = Date.now()
      return padRange({ from: now - 15_552_000_000, to: now + 15_552_000_000 })
    }
    return padRange({
      from: new Date(apiRange.from).getTime(),
      to: new Date(apiRange.to).getTime(),
    })
  }, [apiRange])

  const [focus, setFocus] = useState<number>(() => Date.now())

  useEffect(() => {
    setFocus((previous) =>
      previous >= bounds.from && previous <= bounds.to ? previous : centerOf(bounds),
    )
  }, [bounds])

  const range = useZoomRange({ bounds, scale, focus })

  const setScale = useCallback(
    (next: ScheduleScale) => setFilters({ [SCALE_KEY]: next }),
    [setFilters],
  )

  const goToday = useCallback(() => setFocus(Date.now()), [])

  const zoom = useCallback(
    (direction: 1 | -1) => {
      const index = SCHEDULE_SCALES.indexOf(scale)
      const next =
        SCHEDULE_SCALES[Math.min(SCHEDULE_SCALES.length - 1, Math.max(0, index - direction))]
      if (next && next !== scale) setScale(next)
    },
    [scale, setScale],
  )

  const viewportWidth = useViewportWidth()

  return { scale, range, bounds, viewportWidth, setScale, goToday, zoom }
}

function useViewportWidth(): number {
  const [width, setWidth] = useState(() => (typeof window === 'undefined' ? 0 : window.innerWidth))

  useEffect(() => {
    if (typeof window === 'undefined') return
    const onResize = () => setWidth(window.innerWidth)
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return width
}
