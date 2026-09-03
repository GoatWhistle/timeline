import { ExternalLink } from 'lucide-react'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { eventColorAttrs, eventColorLabelKey } from '@/entities/event/event-color'
import { STAGE_TYPE_ICON, STAGE_TYPE_PATTERNED } from '@/entities/stage/stage.labels'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/overlays/tooltip'
import type { BarSummary } from '../../model/bar-summary'
import type { CalendarSpan } from '../../model/calendar-items'
import { marksWithin } from '../../model/calendar-items'
import { EVENT_KIND_ICON, EVENT_KIND_KEY } from '../../model/event-kind'
import type { PackedSpan } from '../../model/pack-lanes'
import { BAR_RADIUS } from '../../model/schedule-scale'
import { primaryStageType, spanIsUnconfirmed } from '../../model/span-appearance'
import { MomentMark } from '../moment-mark/moment-mark'
import styles from './event-bar.module.css'

export const EventBar = memo(EventBarView)

export type EventBarProps = {
  packed: PackedSpan<CalendarSpan>
  dayWidth: number
  barHeight: number
  top: number
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
  packed,
  dayWidth,
  barHeight,
  top,
  sentence,
  summary,
  focused,
  now,
  highlightedId,
  onFocusItem,
  onOpenItem,
  onOpenMoment,
}: EventBarProps) {
  const { t } = useTranslation()
  const span = packed.item
  const { row } = span

  const stageType = primaryStageType(span, packed)
  const unconfirmed = spanIsUnconfirmed(span)
  const StageIcon = STAGE_TYPE_ICON[stageType]
  const KindIcon = EVENT_KIND_ICON[row.kind]
  const marks = marksWithin(span, packed.startDay, packed.endDay)

  const width = packed.span * dayWidth
  const roomy = barHeight >= 44 && width >= 120
  const showText = width >= 56
  const kindLabel = t(EVENT_KIND_KEY[row.kind])

  return (
    <div
      {...eventColorAttrs(summary.color)}
      className={styles.slot}
      style={{
        left: packed.startDay * dayWidth,
        width,
        top,
        ['--bar-height' as string]: `${barHeight}px`,
        ['--bar-radius' as string]: `${BAR_RADIUS}px`,
      }}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            tabIndex={-1}
            data-schedule-item={span.id}
            data-unconfirmed={unconfirmed ? 'true' : 'false'}
            data-kind={row.kind}
            data-patterned={STAGE_TYPE_PATTERNED[stageType] ? 'true' : 'false'}
            data-clipped-start={packed.clippedStart ? 'true' : 'false'}
            data-clipped-end={packed.clippedEnd ? 'true' : 'false'}
            data-focused={focused ? 'true' : 'false'}
            data-state-name={row.state}
            data-urgency={summary.urgency}
            aria-label={sentence}
            onFocus={onFocusItem}
            onClick={onOpenItem}
            className={styles.bar}
          >
            <span className={styles.head}>
              <span {...eventColorAttrs(summary.color)} className="sr-only">
                {t(eventColorLabelKey(summary.color))}
              </span>
              <KindIcon className={styles.kindIcon} aria-hidden="true" />
              {showText && <span className={styles.title}>{summary.title}</span>}
              {summary.websiteUrl && showText && (
                <a
                  href={summary.websiteUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  tabIndex={-1}
                  data-schedule-website={span.id}
                  className={styles.website}
                  onClick={(event) => event.stopPropagation()}
                >
                  <ExternalLink className={styles.websiteIcon} aria-hidden="true" />
                  <span className="sr-only">
                    {t('schedule.openWebsite', { name: summary.title })}
                  </span>
                </a>
              )}
            </span>

            {roomy ? (
              <span className={styles.lines}>
                <span className={styles.line} data-registration={summary.urgency}>
                  {summary.registration}
                </span>
                {summary.nextStage ? (
                  <span className={styles.line}>
                    <StageIcon className={styles.stageIcon} aria-hidden="true" />
                    {summary.nextStage}
                  </span>
                ) : null}
              </span>
            ) : null}
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">{summary.title}</p>
          <p className="text-muted-foreground">
            {kindLabel} · {summary.state}
          </p>
          <p className="text-muted-foreground">{sentence}</p>
        </TooltipContent>
      </Tooltip>

      <span className={styles.marks}>
        {marks.map((mark) => (
          <MomentMark
            key={mark.id}
            item={mark.moment}
            title={summary.title}
            offset={(mark.dayIndex - packed.startDay + 0.5) / packed.span}
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
