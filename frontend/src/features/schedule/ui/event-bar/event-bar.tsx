import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { EVENT_STATE_KEY } from '@/entities/event/event.labels'
import {
  STAGE_TYPE_COLOR,
  STAGE_TYPE_ICON,
  STAGE_TYPE_PATTERNED,
} from '@/entities/stage/stage.labels'
import { cn } from '@/shared/styling/class-names/class-names'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/overlays/tooltip'
import type { CalendarSpan } from '../../model/calendar-items'
import { marksWithin } from '../../model/calendar-items'
import type { Segment } from '../../model/pack-lanes'
import { BAR_HEIGHT, BAR_RADIUS, laneOffset, type ScheduleScale } from '../../model/schedule-scale'
import { primaryStageType, spanIsUnconfirmed } from '../../model/span-appearance'
import { MomentMark } from '../moment-mark/moment-mark'
import styles from './event-bar.module.css'

export const EventBar = memo(EventBarView)

export type EventBarProps = {
  segment: Segment<CalendarSpan>
  scale: ScheduleScale
  sentence: string
  focused: boolean
  now: Date
  highlightedId?: string
  onFocusItem: () => void
}

function EventBarView({
  segment,
  scale,
  sentence,
  focused,
  now,
  highlightedId,
  onFocusItem,
}: EventBarProps) {
  const { t } = useTranslation()
  const span = segment.item
  const { row } = span

  const stageType = primaryStageType(span, segment)
  const unconfirmed = spanIsUnconfirmed(span)
  const Icon = STAGE_TYPE_ICON[stageType]
  const marks = marksWithin(span, segment.startDay, segment.endDay)

  const left = `calc(${segment.startColumn} * (100% / 7))`
  const width = `calc(${segment.span} * (100% / 7))`

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          tabIndex={-1}
          data-schedule-item={span.id}
          data-schedule-segment={`${span.id}:${segment.week}`}
          data-unconfirmed={unconfirmed ? 'true' : 'false'}
          data-patterned={STAGE_TYPE_PATTERNED[stageType] ? 'true' : 'false'}
          data-clipped-start={segment.clippedStart ? 'true' : 'false'}
          data-clipped-end={segment.clippedEnd ? 'true' : 'false'}
          data-focused={focused ? 'true' : 'false'}
          data-state-name={row.state}
          aria-label={sentence}
          onFocus={onFocusItem}
          className={cn(styles.bar, !unconfirmed && STAGE_TYPE_COLOR[stageType])}
          style={{
            left,
            width,
            top: laneOffset(scale, segment.lane),
            ['--bar-height' as string]: `${BAR_HEIGHT[scale]}px`,
            ['--bar-radius' as string]: `${BAR_RADIUS}px`,
          }}
        >
          <Icon className="size-3 shrink-0" aria-hidden="true" />
          <span className={styles.title}>{row.title}</span>

          <span className={styles.marks} aria-hidden="true">
            {marks.map((mark) => (
              <MomentMark
                key={mark.id}
                item={mark.moment}
                offset={(mark.dayIndex - segment.startDay + 0.5) / segment.span}
                highlighted={mark.id === highlightedId}
                now={now}
              />
            ))}
          </span>
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <p className="font-medium">{row.title}</p>
        <p className="text-muted-foreground">{t(EVENT_STATE_KEY[row.state])}</p>
        <p className="text-muted-foreground">{sentence}</p>
      </TooltipContent>
    </Tooltip>
  )
}
