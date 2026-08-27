import { scaleTime } from 'd3-scale'
import { eachMonthOfInterval, eachWeekOfInterval, format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useCallback, useMemo } from 'react'
import { canvasWidth, MIN_BAR_SPAN, type TimelineScale } from './schedule-scale'

export type ScheduleGeometry = {
  ticks: Date[]
  width: number
  x: (date: Date) => number
  position: (startIso: string, endIso: string) => { left: number; width: number }
  tickLabel: (date: Date) => string
}

export function useScheduleGeometry(
  fromIso: string,
  toIso: string,
  scale: TimelineScale,
): ScheduleGeometry {
  const ticks = useMemo(() => {
    const from = new Date(fromIso)
    const to = new Date(toIso)
    if (to <= from) return [from]
    return scale === 'month'
      ? eachMonthOfInterval({ start: from, end: to })
      : eachWeekOfInterval({ start: from, end: to }, { weekStartsOn: 1 })
  }, [fromIso, toIso, scale])

  const width = canvasWidth(ticks.length, scale)

  const x = useMemo(
    () =>
      scaleTime()
        .domain([new Date(fromIso), new Date(toIso)])
        .range([0, width]),
    [fromIso, toIso, width],
  )

  const position = useCallback(
    (startIso: string, endIso: string) => {
      const start = x(new Date(startIso))
      const end = x(new Date(endIso))
      const left = Math.max(0, Math.min(start, width))
      const right = Math.max(0, Math.min(end, width))
      return { left, width: Math.max(MIN_BAR_SPAN, right - left) }
    },
    [x, width],
  )

  const tickLabel = useCallback(
    (date: Date) =>
      scale === 'month'
        ? format(date, 'LLLL yyyy', { locale: ru })
        : format(date, 'd MMM', { locale: ru }),
    [scale],
  )

  return { ticks, width, x, position, tickLabel }
}
