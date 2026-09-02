import { type KeyboardEvent, memo } from 'react'
import { useTranslation } from 'react-i18next'
import type { BarSummary } from '../../model/bar-summary'
import type { CalendarWeek as CalendarWeekData } from '../../model/calendar-grid'
import type { CalendarSpan } from '../../model/calendar-items'
import type { WeekPacking } from '../../model/pack-lanes'
import { type ScheduleScale, weekHeight } from '../../model/schedule-scale'
import { EventBar } from '../event-bar/event-bar'
import styles from './schedule-grid.module.css'

export const CalendarWeek = memo(CalendarWeekView)

export type CalendarWeekProps = {
  week: CalendarWeekData
  packing: WeekPacking<CalendarSpan>
  scale: ScheduleScale
  now: Date
  focusedId?: string
  isCursorWeek: boolean
  highlightedId?: string
  dayLabel: (date: Date) => string
  sentenceOf: (span: CalendarSpan) => string
  summaryOf: (span: CalendarSpan) => BarSummary
  onToggleOverflow: () => void
  onOpenSpan: (span: CalendarSpan) => void
  onOpenMoment: (span: CalendarSpan, momentId: string) => void
  onKeyDown: (event: KeyboardEvent<HTMLTableRowElement>) => void
  onFocusWeek: () => void
  onFocusSpan: (id: string) => void
}

function CalendarWeekView(props: CalendarWeekProps) {
  const { t } = useTranslation()
  const { week, packing, scale, now, focusedId, highlightedId } = props

  const visible = packing.segments
  const hidden = packing.hidden

  return (
    <tr
      className={styles.week}
      tabIndex={props.isCursorWeek ? 0 : -1}
      data-schedule-week={week.index}
      aria-label={t('schedule.weekAria', {
        date: props.dayLabel(week.days[0]?.date ?? new Date()),
      })}
      style={{ height: weekHeight(scale, packing.laneCount, hidden > 0) }}
      onKeyDown={props.onKeyDown}
      onFocus={props.onFocusWeek}
    >
      {week.days.map((day) => (
        <td
          key={day.index}
          className={styles.day}
          data-schedule-day={day.index}
          data-in-range={day.inRange ? 'true' : 'false'}
          data-first-of-month={day.isFirstOfMonth ? 'true' : 'false'}
          data-today={isSameDay(day.date, now) ? 'true' : 'false'}
        >
          <span className={styles.dayNumber}>
            {isSameDay(day.date, now) ? (
              <span className={styles.todayBadge}>{props.dayLabel(day.date)}</span>
            ) : (
              props.dayLabel(day.date)
            )}
          </span>
        </td>
      ))}

      <td className={styles.bars}>
        {visible.map((segment) => (
          <EventBar
            key={`${segment.item.id}:${segment.week}`}
            segment={segment}
            scale={scale}
            sentence={props.sentenceOf(segment.item)}
            summary={props.summaryOf(segment.item)}
            focused={props.isCursorWeek && focusedId === segment.item.id}
            now={now}
            highlightedId={highlightedId}
            onFocusItem={() => props.onFocusSpan(segment.item.id)}
            onOpenItem={() => props.onOpenSpan(segment.item)}
            onOpenMoment={(momentId) => props.onOpenMoment(segment.item, momentId)}
          />
        ))}

        {hidden > 0 && (
          <button
            type="button"
            tabIndex={-1}
            data-schedule-overflow={week.index}
            className={styles.overflow}
            onClick={props.onToggleOverflow}
          >
            {t('schedule.moreEvents', { count: hidden })}
          </button>
        )}
      </td>
    </tr>
  )
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}
