import { differenceInCalendarDays, startOfDay } from 'date-fns'
import { useMemo } from 'react'
import type { CalendarSpan } from '../../model/calendar-items'
import { packTimeline } from '../../model/pack-lanes'
import {
  bandLaneTop,
  bandTrackHeight,
  RIBBON_BAND_BAR,
  RIBBON_BAND_MAX_LANES,
  ribbonZoned,
} from '../../model/ribbon/ribbon-layout'
import { ScheduleBar } from '../schedule-bar/schedule-bar'
import styles from './ribbon.module.css'

export type RibbonBandProps = {
  spans: readonly CalendarSpan[]
  start: Date
  dayCount: number
  dayWidth: number
  sentenceOf: (span: CalendarSpan) => string
  onSelect?: (id: string | undefined) => void
  onOpen: (span: CalendarSpan) => void
}

export function RibbonBand({
  spans,
  start,
  dayCount,
  dayWidth,
  sentenceOf,
  onSelect,
  onOpen,
}: RibbonBandProps) {
  const packing = useMemo(() => {
    const anchor = startOfDay(start)
    const inputs = spans.map((span) => ({
      id: span.id,
      span,
      startDay: differenceInCalendarDays(ribbonZoned(span.row.start_at), anchor),
      endDay: differenceInCalendarDays(ribbonZoned(span.row.end_at), anchor),
    }))
    return packTimeline(inputs, dayCount, RIBBON_BAND_MAX_LANES)
  }, [spans, start, dayCount])

  const height = bandTrackHeight(packing.laneCount)

  return (
    <div
      className={styles.band}
      data-ribbon-band
      style={{ ['--ribbon-band-height' as string]: `${height}px`, height }}
    >
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
            left: bar.startDay * dayWidth,
            width: Math.max(RIBBON_BAND_BAR, bar.span * dayWidth - 2),
            top: bandLaneTop(bar.lane),
            height: RIBBON_BAND_BAR,
          }}
          onSelect={() => onSelect?.(bar.item.span.id)}
          onOpen={() => onOpen(bar.item.span)}
        />
      ))}
    </div>
  )
}
