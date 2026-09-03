import type { Locale } from 'date-fns'
import { format, isSameDay, startOfDay } from 'date-fns'
import { useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { ScheduleResponse, ScheduleRow as ScheduleRowData } from '@/shared/api/types.gen'
import { formatDate, formatRelative } from '@/shared/datetime/datetime'
import { TooltipProvider } from '@/shared/ui/overlays/tooltip'
import { type CalendarSpan, splitByZone } from '../../model/calendar-items'
import { hourWindow } from '../../model/pack-lanes'
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
  WEEK_HOUR_HEIGHT,
} from './week-layout'

export type WeekGridProps = {
  data: ScheduleResponse
  from: Date
  to: Date
  locale: Locale
  now?: Date
  selectedId?: string
  onSelect?: (id: string | undefined) => void
  onOpenEvent?: (row: ScheduleRowData) => void
}

export function WeekGrid({
  data,
  from,
  to,
  locale,
  now = new Date(),
  selectedId,
  onSelect,
  onOpenEvent,
}: WeekGridProps) {
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

  const window = useMemo(() => hourWindow(columns.flatMap((column) => column.entries)), [columns])

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

  const open = (span: CalendarSpan) => {
    announce(sentenceOf(span))
    onOpenEvent?.(span.row)
  }

  const toggle = (id: string) => onSelect?.(selectedId === id ? undefined : id)
  const clear = () => onSelect?.(undefined)

  return (
    <TooltipProvider>
      <div
        className={styles.frame}
        data-schedule-week
        data-has-selection={selectedId ? 'true' : 'false'}
        role="application"
        aria-label={t('schedule.tableAria')}
        onKeyDown={(event) => {
          if (event.key !== 'Escape' || !selectedId) return
          event.preventDefault()
          clear()
        }}
        onPointerDown={(event) => {
          if (event.target === event.currentTarget) clear()
        }}
        style={{
          ['--week-axis' as string]: `${WEEK_AXIS_WIDTH}px`,
          ['--week-hour' as string]: `${WEEK_HOUR_HEIGHT}px`,
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
          emptyLabel={t('schedule.allDayEmpty')}
          selectedId={selectedId}
          sentenceOf={sentenceOf}
          onFocusItem={(id) => onSelect?.(id)}
          onSelect={toggle}
          onClear={clear}
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
              selectedId={selectedId}
              sentenceOf={sentenceOf}
              onFocusItem={(id) => onSelect?.(id)}
              onSelect={toggle}
              onClear={clear}
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
