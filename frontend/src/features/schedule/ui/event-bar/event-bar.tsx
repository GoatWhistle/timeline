import { memo } from 'react'
import { EventColorMark, eventColorAttrs } from '@/entities/event/event-color'
import { STAGE_TYPE_ICON, STAGE_TYPE_PATTERNED } from '@/entities/stage/stage.labels'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/overlays/tooltip'
import type { BarSummary } from '../../model/bar-summary'
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
  summary: BarSummary
  focused: boolean
  now: Date
  highlightedId?: string
  onFocusItem: () => void
  onOpenItem: () => void
  onOpenMoment: (momentId: string) => void
}

function EventBarView({
  segment,
  scale,
  sentence,
  summary,
  focused,
  now,
  highlightedId,
  onFocusItem,
  onOpenItem,
  onOpenMoment,
}: EventBarProps) {
  const span = segment.item
  const { row } = span

  const stageType = primaryStageType(span, segment)
  const unconfirmed = spanIsUnconfirmed(span)
  const Icon = STAGE_TYPE_ICON[stageType]
  const marks = marksWithin(span, segment.startDay, segment.endDay)
  const roomy = scale !== 'quarter'

  return (
    <div
      {...eventColorAttrs(summary.color)}
      className={styles.slot}
      style={{
        left: `calc(${segment.startColumn} * (100% / 7))`,
        width: `calc(${segment.span} * (100% / 7))`,
        top: laneOffset(scale, segment.lane),
        ['--bar-height' as string]: `${BAR_HEIGHT[scale]}px`,
        ['--bar-radius' as string]: `${BAR_RADIUS}px`,
      }}
    >
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
            data-urgency={summary.urgency}
            aria-label={sentence}
            onFocus={onFocusItem}
            onClick={onOpenItem}
            className={styles.bar}
          >
            <span className={styles.head}>
              <EventColorMark color={summary.color} className={styles.colorMark} />
              <Icon className={styles.icon} aria-hidden="true" />
              <span className={styles.title}>{summary.title}</span>
            </span>

            {roomy ? (
              <span className={styles.lines}>
                <span className={styles.line}>{summary.dates}</span>
                <span className={styles.line} data-registration={summary.urgency}>
                  {summary.registration}
                </span>
                {summary.nextStage ? (
                  <span className={styles.line}>{summary.nextStage}</span>
                ) : null}
              </span>
            ) : null}
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">{summary.title}</p>
          <p className="text-muted-foreground">{summary.state}</p>
          <p className="text-muted-foreground">{sentence}</p>
        </TooltipContent>
      </Tooltip>

      <span className={styles.marks}>
        {marks.map((mark) => (
          <MomentMark
            key={mark.id}
            item={mark.moment}
            title={summary.title}
            offset={(mark.dayIndex - segment.startDay + 0.5) / segment.span}
            highlighted={mark.id === highlightedId}
            now={now}
            onOpen={() => onOpenMoment(mark.id)}
            onOpenEvent={onOpenItem}
          />
        ))}
      </span>
    </div>
  )
}
