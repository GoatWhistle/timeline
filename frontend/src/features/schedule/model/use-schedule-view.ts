import {
  addDays,
  addMonths,
  addQuarters,
  addWeeks,
  addYears,
  endOfMonth,
  endOfQuarter,
  endOfWeek,
  format,
  type Locale,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
} from 'date-fns'
import { useCallback, useMemo } from 'react'
import { useUrlFilters } from '@/shared/hooks/use-url-filters/use-url-filters'
import { WEEK_STARTS_ON } from './month-grid'
import { ribbonWindow } from './ribbon/ribbon-window'
import {
  DEFAULT_SCALE,
  isScheduleScale,
  type ScheduleScale,
  WRAPPED_SHAPE,
  type WrappedShape,
} from './schedule-scale'

export type ScheduleView = {
  scale: ScheduleScale
  from: Date
  to: Date
  offset: number
  selectedId: string | undefined
  setScale: (next: ScheduleScale) => void
  step: (direction: 1 | -1) => void
  goToday: () => void
  select: (id: string | undefined) => void
  atPresent: boolean
  wrapped: WrappedShape | undefined
}

const SCALE_KEY = 'scale'
const OFFSET_KEY = 'period'
const SELECTED_KEY = 'selected'

const SHIFT: Record<ScheduleScale, (date: Date, amount: number) => Date> = {
  week: addWeeks,
  month: addMonths,
  quarter: addQuarters,
  year: addYears,
  all: addYears,
}

export function periodStart(scale: ScheduleScale, now: Date, offset: number): Date {
  const anchor = SHIFT[scale](now, offset)
  if (scale === 'all') return ribbonWindow(now, offset).start
  if (scale === 'week') return startOfWeek(anchor, { weekStartsOn: WEEK_STARTS_ON })
  if (scale === 'month') return startOfMonth(anchor)
  if (scale === 'quarter') return startOfQuarter(anchor)
  return new Date(anchor.getFullYear(), 0, 1)
}

export function scaleRange(scale: ScheduleScale, now: Date, offset = 0) {
  const from = periodStart(scale, now, offset)
  if (scale === 'all') {
    const window = ribbonWindow(now, offset)
    return { from, to: addDays(from, window.dayCount - 1) }
  }
  if (scale === 'week') return { from, to: endOfWeek(from, { weekStartsOn: WEEK_STARTS_ON }) }
  if (scale === 'month') return { from, to: endOfMonth(from) }
  if (scale === 'quarter') return { from, to: endOfQuarter(from) }
  return { from, to: new Date(from.getFullYear(), 11, 31) }
}

export function parseOffset(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? '0', 10)
  return Number.isFinite(parsed) ? parsed : 0
}

export function useScheduleView(now: Date = new Date()): ScheduleView {
  const [filters, setFilters] = useUrlFilters({
    [SCALE_KEY]: DEFAULT_SCALE as string,
    [OFFSET_KEY]: '0',
    [SELECTED_KEY]: '',
  })

  const scale = isScheduleScale(filters.scale) ? filters.scale : DEFAULT_SCALE
  const offset = parseOffset(filters.period)
  const selectedId = filters.selected ? filters.selected : undefined

  const anchor = useMemo(() => now.getTime(), [now])
  const base = useMemo(() => new Date(anchor), [anchor])
  const { from, to } = useMemo(() => scaleRange(scale, base, offset), [scale, base, offset])

  const setScale = useCallback(
    (next: ScheduleScale) => setFilters({ [SCALE_KEY]: next, [OFFSET_KEY]: undefined }),
    [setFilters],
  )

  const step = useCallback(
    (direction: 1 | -1) => setFilters({ [OFFSET_KEY]: String(offset + direction) }),
    [setFilters, offset],
  )

  const goToday = useCallback(() => setFilters({ [OFFSET_KEY]: undefined }), [setFilters])

  const select = useCallback(
    (id: string | undefined) => setFilters({ [SELECTED_KEY]: id ?? undefined }),
    [setFilters],
  )

  return {
    scale,
    from,
    to,
    offset,
    selectedId,
    setScale,
    step,
    goToday,
    select,
    atPresent: offset === 0,
    wrapped:
      scale === 'year' || scale === 'quarter' || scale === 'month'
        ? WRAPPED_SHAPE[scale]
        : undefined,
  }
}

export function weekDays(from: Date): Date[] {
  return Array.from({ length: 7 }, (_, index) => addDays(from, index))
}

export function periodLabel(scale: ScheduleScale, from: Date, to: Date, locale: Locale): string {
  if (scale === 'year') return format(from, 'yyyy', { locale })
  if (scale === 'quarter') return `${format(from, 'QQQ', { locale })} ${format(from, 'yyyy')}`
  if (scale === 'month') return format(from, 'LLLL yyyy', { locale })
  const sameMonth = from.getMonth() === to.getMonth()
  const start = format(from, sameMonth ? 'd' : 'd MMM', { locale })
  return `${start} — ${format(to, 'd MMM yyyy', { locale })}`
}
