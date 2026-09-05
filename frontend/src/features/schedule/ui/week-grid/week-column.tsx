import type { CalendarSpan } from '../../model/calendar-items'
import { ScheduleBar } from '../schedule-bar/schedule-bar'
import styles from './week-grid.module.css'
import {
  type DayColumn,
  MINUTES_PER_HOUR,
  timedHeight,
  timedTop,
  WEEK_HOUR_HEIGHT,
} from './week-layout'

export type WeekColumnProps = {
  column: DayColumn
  hours: readonly number[]
  startHour: number
  weekend: boolean
  nowMinute?: number
  sentenceOf: (span: CalendarSpan) => string
  onOpen: (span: CalendarSpan) => void
}

export function WeekColumn({
  column,
  hours,
  startHour,
  weekend,
  nowMinute,
  sentenceOf,
  onOpen,
}: WeekColumnProps) {
  const height = hours.length * WEEK_HOUR_HEIGHT
  const showNow =
    nowMinute !== undefined &&
    nowMinute >= startHour * MINUTES_PER_HOUR &&
    nowMinute <= (startHour + hours.length) * MINUTES_PER_HOUR

  return (
    <div
      className={styles.column}
      data-schedule-column
      data-weekend={weekend ? 'true' : 'false'}
      style={{ height }}
    >
      {hours.map((hour, index) => (
        <span
          key={hour}
          className={styles.hourLine}
          style={{ top: index * WEEK_HOUR_HEIGHT }}
          aria-hidden="true"
        />
      ))}

      {showNow && (
        <span
          className={styles.nowLine}
          data-schedule-now
          style={{ top: timedTop(nowMinute, startHour) }}
          aria-hidden="true"
        />
      )}

      {column.packed.map((entry) => (
        <ScheduleBar
          key={entry.item.id}
          span={entry.item.span}
          sentence={sentenceOf(entry.item.span)}
          selected={false}
          timed
          style={{
            position: 'absolute',
            top: timedTop(entry.startMinute, startHour),
            height: Math.max(18, timedHeight(entry.startMinute, entry.endMinute) - 2),
            left: `calc(${entry.column} * (100% / ${entry.columns}) + 2px)`,
            width: `calc(100% / ${entry.columns} - 4px)`,
          }}
          onOpen={() => onOpen(entry.item.span)}
        />
      ))}
    </div>
  )
}
