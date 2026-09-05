import type { CalendarSpan } from '../../model/calendar-items'
import {
  hourLineTop,
  hourTrackHeight,
  minuteOffset,
  RIBBON_AXIS_WIDTH,
  RIBBON_MIN_TIMED_WIDTH,
  ribbonHours,
  type TimedPlacement,
  timedBarHeight,
  timedBarTop,
  timedClippedEnd,
  timedClippedStart,
} from '../../model/ribbon/ribbon-layout'
import { MINUTES_PER_DAY } from '../../model/ribbon/ribbon-window'
import { ScheduleBar } from '../schedule-bar/schedule-bar'
import styles from './ribbon.module.css'

export type RibbonHoursProps = {
  placements: readonly TimedPlacement[]
  dayWidth: number
  label: string
  selectedId?: string
  sentenceOf: (span: CalendarSpan) => string
  onSelect?: (id: string | undefined) => void
  onOpen: (span: CalendarSpan) => void
}

export function RibbonHours({
  placements,
  dayWidth,
  label,
  selectedId,
  sentenceOf,
  onSelect,
  onOpen,
}: RibbonHoursProps) {
  const hours = ribbonHours()
  const height = hourTrackHeight()

  return (
    <section
      className={styles.timed}
      data-ribbon-hours
      aria-label={label}
      style={{
        ['--ribbon-hour-track' as string]: `${height}px`,
        ['--ribbon-axis' as string]: `${RIBBON_AXIS_WIDTH}px`,
      }}
    >
      {hours.map((hour) => (
        <span
          key={hour}
          className={styles.hourLine}
          data-ribbon-hour-line={hour}
          style={{ top: hourLineTop(hour) }}
          aria-hidden="true"
        />
      ))}

      <div className={styles.axis} data-ribbon-axis aria-hidden="true" style={{ height }}>
        {hours.map((hour) => (
          <span
            key={hour}
            className={styles.hourLabel}
            data-ribbon-hour={hour}
            style={{ top: hourLineTop(hour) }}
          >
            {String(hour).padStart(2, '0')}:00
          </span>
        ))}
      </div>

      {placements.map((entry) => (
        <ScheduleBar
          key={entry.id}
          span={entry.span}
          sentence={sentenceOf(entry.span)}
          selected={selectedId === entry.span.id}
          timed
          clippedStart={timedClippedStart(entry.startMinute)}
          clippedEnd={timedClippedEnd(entry.endMinute)}
          style={{
            position: 'absolute',
            left: minuteOffset(entry.dayIndex, entry.startMinute, dayWidth),
            width: Math.max(
              RIBBON_MIN_TIMED_WIDTH,
              ((entry.endMinute - entry.startMinute) / MINUTES_PER_DAY) * dayWidth,
            ),
            top: timedBarTop(entry.startMinute),
            height: timedBarHeight(entry.startMinute, entry.endMinute),
          }}
          onSelect={() => onSelect?.(entry.span.id)}
          onOpen={() => onOpen(entry.span)}
        />
      ))}
    </section>
  )
}
