import type { Locale } from 'date-fns'
import { format, isSameDay, startOfDay } from 'date-fns'
import { useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { ScheduleResponse, ScheduleRow as ScheduleRowData } from '@/shared/api/types.gen'
import { formatDate, formatRelative } from '@/shared/datetime/datetime'
import { TooltipProvider } from '@/shared/ui/overlays/tooltip'
import { type CalendarSpan, splitByZone } from '../../model/calendar-items'
import { hourWindow, restingHour } from '../../model/pack-lanes'
import { rowSentence } from '../../model/row-sentence'
import { buildTimelineGrid } from '../../model/timeline-grid'
import { useAnnouncer } from '../../model/use-announcer'
import { WeekBand } from './week-band'
import { WeekColumn } from './week-column'
import styles from './week-grid.module.css'
import {
  buildDayColumns,
  buildWeekBand,
  minutesOfDay,
  WEEK_AXIS_WIDTH,
  WEEK_BAND_BAR,
  WEEK_BODY_MAX_HEIGHT,
  WEEK_HOUR_HEIGHT,
  WEEK_LABEL_CLEARANCE,
} from './week-layout'

export type WeekGridProps = {
  data: ScheduleResponse
  from: Date
  to: Date
  locale: Locale
  now?: Date
  onOpenEvent?: (row: ScheduleRowData) => void
}

export function WeekGrid({ data, from, to, locale, now = new Date(), onOpenEvent }: WeekGridProps) {
  const { t } = useTranslation()
  const bodyRef = useRef<HTMLDivElement>(null)
  const { message, announce } = useAnnouncer()

  const grid = useMemo(() => buildTimelineGrid(from, to), [from, to])
  const days = useMemo(() => grid.days.map((day) => startOfDay(day.date)).slice(0, 7), [grid])

  const zones = useMemo(() => {
    const spans = buildWeekBand(data, grid)
    return splitByZone(spans)
  }, [data, grid])

  const columns = useMemo(() => buildDayColumns(zones.timed, days), [zones.timed, days])

  const window = useMemo(() => hourWindow(), [])

  const hours = useMemo(
    () =>
      Array.from(
        { length: window.endHour - window.startHour + 1 },
        (_, index) => window.startHour + index,
      ),
    [window],
  )

  const sentenceOf = useMemo(() => {
    const context = {
      t,
      formatDate: (iso: string) => formatDate(iso),
      formatRemaining: (iso: string) => formatRelative(iso, now),
      now,
    }
    return (span: CalendarSpan) => rowSentence(span.row, span.items, context)
  }, [t, now])

  const nowMinute = minutesOfDay(now)
  const todayIndex = days.findIndex((day) => isSameDay(day, now))

  const resting = useMemo(
    () =>
      restingHour(
        columns.flatMap((column) => column.entries),
        todayIndex === -1 ? undefined : nowMinute,
      ),
    [columns, todayIndex, nowMinute],
  )

  useEffect(() => {
    const body = bodyRef.current
    if (!body) return
    let page: HTMLElement | null = body.parentElement
    while (page && page.scrollHeight <= page.clientHeight) page = page.parentElement
    if (!page) return
    const offset = Math.max(
      0,
      (resting - window.startHour) * WEEK_HOUR_HEIGHT - WEEK_LABEL_CLEARANCE,
    )
    page.scrollTop = body.offsetTop - page.offsetTop + offset
  }, [resting, window.startHour])

  const open = (span: CalendarSpan) => {
    announce(sentenceOf(span))
    onOpenEvent?.(span.row)
  }

  return (
    <TooltipProvider>
      <div
        className={styles.frame}
        data-schedule-week
        role="application"
        aria-label={t('schedule.tableAria')}
        style={{
          ['--week-axis' as string]: `${WEEK_AXIS_WIDTH}px`,
          ['--week-body-max' as string]: `${WEEK_BODY_MAX_HEIGHT}px`,
        }}
      >
        <div className={styles.head}>
          <span className={styles.axisCorner} aria-hidden="true" />
          {days.map((day) => (
            <div
              key={day.toISOString()}
              className={styles.dayHead}
              data-schedule-day-head
              data-weekend={day.getDay() === 0 || day.getDay() === 6 ? 'true' : 'false'}
              data-today={isSameDay(day, now) ? 'true' : 'false'}
            >
              <span className={styles.dayName}>{format(day, 'EEEEEE', { locale })}</span>
              <span className={styles.dayNumber}>{day.getDate()}</span>
            </div>
          ))}
        </div>

        <WeekBand
          spans={zones.allDay}
          days={days}
          barHeight={WEEK_BAND_BAR}
          label={t('schedule.allDay')}
          shortLabel={t('schedule.allDayShort')}
          sentenceOf={sentenceOf}
          onOpen={open}
        />

        <div className={styles.body} ref={bodyRef} data-schedule-hours>
          <div
            className={styles.axis}
            style={{ height: hours.length * WEEK_HOUR_HEIGHT }}
            aria-hidden="true"
          >
            {hours.map((hour, index) => (
              <span
                key={hour}
                className={styles.hourLabel}
                style={{ top: index * WEEK_HOUR_HEIGHT }}
              >
                {String(hour).padStart(2, '0')}:00
              </span>
            ))}
          </div>

          {columns.map((column, index) => (
            <WeekColumn
              key={column.day.toISOString()}
              column={column}
              hours={hours}
              startHour={window.startHour}
              weekend={column.day.getDay() === 0 || column.day.getDay() === 6}
              nowMinute={index === todayIndex ? nowMinute : undefined}
              sentenceOf={sentenceOf}
              onOpen={open}
            />
          ))}
        </div>
      </div>

      <output aria-live="polite" className="sr-only">
        {message}
      </output>
    </TooltipProvider>
  )
}
