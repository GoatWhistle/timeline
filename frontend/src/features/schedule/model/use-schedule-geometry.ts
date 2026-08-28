import { scaleTime } from 'd3-scale'
import { eachDayOfInterval, eachMonthOfInterval, eachWeekOfInterval, format } from 'date-fns'
import { enUS, ru } from 'date-fns/locale'
import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { DEFAULT_LOCALE, isLocale } from '@/shared/i18n/locale'
import { canvasWidth, MIN_BAR_SPAN, type ScheduleScale, TICK_WIDTH } from './schedule-scale'
import type { Range } from './zoom-range'

const DATE_FNS_LOCALES = { ru, en: enUS }

const TICK_PATTERN: Record<ScheduleScale, string> = {
  week: 'EEE d',
  month: 'd MMM',
  quarter: 'LLLL yyyy',
}

export type ScheduleGeometry = {
  ticks: Date[]
  width: number
  x: (date: Date) => number
  position: (startIso: string, endIso: string) => { left: number; width: number }
  tickLabel: (date: Date) => string
}

export function buildTicks(from: Date, to: Date, scale: ScheduleScale): Date[] {
  if (!(to > from)) return [from]
  if (scale === 'week') return eachDayOfInterval({ start: from, end: to })
  if (scale === 'month') return eachWeekOfInterval({ start: from, end: to }, { weekStartsOn: 1 })
  return eachMonthOfInterval({ start: from, end: to })
}

export function thinTicks(ticks: readonly Date[], width: number, scale: ScheduleScale): Date[] {
  const maximum = Math.max(1, Math.floor(width / TICK_WIDTH[scale]))
  if (ticks.length <= maximum) return [...ticks]
  const step = Math.ceil(ticks.length / maximum)
  return ticks.filter((_, index) => index % step === 0)
}

export function useScheduleGeometry(
  range: Range,
  scale: ScheduleScale,
  available = 0,
): ScheduleGeometry {
  const { i18n } = useTranslation()
  const language = i18n.language?.split('-')[0]
  const locale = DATE_FNS_LOCALES[isLocale(language) ? language : DEFAULT_LOCALE]

  const { from, to } = range
  const width = canvasWidth(scale, available)

  const ticks = useMemo(
    () => thinTicks(buildTicks(new Date(from), new Date(to), scale), width, scale),
    [from, to, scale, width],
  )

  const x = useMemo(
    () =>
      scaleTime()
        .domain([new Date(from), new Date(to)])
        .range([0, width]),
    [from, to, width],
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
    (date: Date) => format(date, TICK_PATTERN[scale], { locale }),
    [scale, locale],
  )

  return { ticks, width, x, position, tickLabel }
}
