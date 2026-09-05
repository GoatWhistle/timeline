import { differenceInCalendarDays, startOfDay } from 'date-fns'
import { useMemo } from 'react'
import type { CalendarSpan } from '../../model/calendar-items'
import { DAYS_PER_WEEK, packTimeline } from '../../model/pack-lanes'
import { ScheduleBar } from '../schedule-bar/schedule-bar'
import styles from './week-grid.module.css'
import { bandHeight, bandViewportHeight, WEEK_BAND_GAP, zoned } from './week-layout'

export type WeekBandProps = {
  spans: readonly CalendarSpan[]
  days: readonly Date[]
  barHeight: number
  label: string
  shortLabel: string
  sentenceOf: (span: CalendarSpan) => string
  onOpen: (span: CalendarSpan) => void
}

export function WeekBand({
  spans,
  days,
  barHeight,
  label,
  shortLabel,
  sentenceOf,
  onOpen,
}: WeekBandProps) {
  const first = days[0]

  const packing = useMemo(() => {
    if (!first) return { packed: [], laneCount: 0 }
    const anchor = startOfDay(first)
    const inputs = spans.map((span) => ({
      id: span.id,
      span,
      startDay: differenceInCalendarDays(zoned(span.row.start_at), anchor),
      endDay: differenceInCalendarDays(zoned(span.row.end_at), anchor),
    }))
    return packTimeline(inputs, DAYS_PER_WEEK)
  }, [spans, first])

  const height = bandHeight(packing.laneCount)
  const viewport = bandViewportHeight(packing.laneCount)

  return (
    <div
      className={styles.band}
      data-schedule-band
      style={{ ['--band-height' as string]: `${viewport}px` }}
    >
      <span className={styles.bandLabel}>
        <span aria-hidden="true">{shortLabel}</span>
        <span className="sr-only">{label}</span>
      </span>

      <div className={styles.bandScroll} style={{ maxHeight: viewport }}>
        <div className={styles.bandLanes} style={{ height }}>
          <div className={styles.bandColumns} aria-hidden="true">
            {days.map((day) => (
              <span
                key={day.toISOString()}
                className={styles.bandColumn}
                data-weekend={day.getDay() === 0 || day.getDay() === 6 ? 'true' : 'false'}
              />
            ))}
          </div>

          {packing.packed.map((bar) => (
            <ScheduleBar
              key={bar.item.id}
              span={bar.item.span}
              sentence={sentenceOf(bar.item.span)}
              selected={false}
              clippedStart={bar.clippedStart}
              clippedEnd={bar.clippedEnd}
              style={{
                position: 'absolute',
                left: `calc(${bar.startDay} * (100% / ${DAYS_PER_WEEK}))`,
                width: `calc(${bar.span} * (100% / ${DAYS_PER_WEEK}) - 4px)`,
                top: WEEK_BAND_GAP + bar.lane * (barHeight + WEEK_BAND_GAP),
                height: barHeight,
              }}
              onOpen={() => onOpen(bar.item.span)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
