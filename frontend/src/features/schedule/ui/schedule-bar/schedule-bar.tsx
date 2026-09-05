import { ExternalLink } from 'lucide-react'
import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { eventColorAttrs, eventColorLabelKey } from '@/entities/event/event-color'
import { formatEventMoment } from '@/shared/datetime/datetime'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/overlays/tooltip'
import type { CalendarSpan } from '../../model/calendar-items'
import { EVENT_KIND_ICON } from '../../model/event-kind'
import { BarTooltip } from './bar-tooltip'
import styles from './schedule-bar.module.css'

export type ScheduleBarProps = {
  span: CalendarSpan
  sentence: string
  selected: boolean
  timed?: boolean
  clippedStart?: boolean
  clippedEnd?: boolean
  style?: CSSProperties
  onFocusItem?: () => void
  onSelect: () => void
  onOpen: () => void
}

export function ScheduleBar({
  span,
  sentence,
  selected,
  timed = false,
  clippedStart = false,
  clippedEnd = false,
  style,
  onFocusItem,
  onSelect,
  onOpen,
}: ScheduleBarProps) {
  const { t } = useTranslation()
  const { row } = span
  const KindIcon = EVENT_KIND_ICON[row.kind]

  return (
    <div {...eventColorAttrs(row.color ?? null)} className={styles.slot} style={style}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={styles.bar}
            data-schedule-item={span.id}
            data-kind={row.kind}
            data-timed={timed ? 'true' : 'false'}
            data-selected={selected ? 'true' : 'false'}
            data-clipped-start={clippedStart ? 'true' : 'false'}
            data-clipped-end={clippedEnd ? 'true' : 'false'}
            aria-current={selected ? 'true' : undefined}
            aria-label={sentence}
            onFocus={onFocusItem}
            onClick={onSelect}
            onDoubleClick={onOpen}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return
              event.preventDefault()
              onOpen()
            }}
          >
            <span className={styles.head}>
              <span {...eventColorAttrs(row.color ?? null)} className="sr-only">
                {t(eventColorLabelKey(row.color ?? null))}
              </span>
              <KindIcon className={styles.kindIcon} aria-hidden="true" />
              <span className={styles.title}>{row.title}</span>
              {row.website_url && (
                <a
                  href={row.website_url}
                  target="_blank"
                  rel="noreferrer noopener"
                  tabIndex={-1}
                  data-schedule-website={span.id}
                  className={styles.website}
                  onClick={(event) => event.stopPropagation()}
                >
                  <ExternalLink className={styles.websiteIcon} aria-hidden="true" />
                  <span className="sr-only">{t('schedule.openWebsite', { name: row.title })}</span>
                </a>
              )}
            </span>
            {timed && <span className={styles.time}>{formatEventMoment(row.start_at)}</span>}
            {selected && <span className="sr-only">{t('schedule.selected')}</span>}
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <BarTooltip row={row} />
        </TooltipContent>
      </Tooltip>
    </div>
  )
}
