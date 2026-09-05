import { ExternalLink } from 'lucide-react'
import { type KeyboardEvent, memo } from 'react'
import { useTranslation } from 'react-i18next'
import { eventColorAttrs } from '@/entities/event/event-color'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/overlays/tooltip'
import { EVENT_KIND_ICON } from '../../model/event-kind'
import type { MonthWeekBar } from '../../model/month-grid'
import { WRAPPED_ICON_BAR, WRAPPED_TEXT_BAR } from '../../model/schedule-scale'
import { BarTooltip } from '../schedule-bar/bar-tooltip'
import styles from './wrapped-bar.module.css'

export const WrappedBar = memo(WrappedBarView)

export type WrappedBarProps = {
  bar: MonthWeekBar
  columnsPerRow: number
  cellWidth: number
  barHeight: number
  top: number
  sentence: string
  days: string
  focused: boolean
  selected: boolean
  onFocusItem: () => void
  onSelect: () => void
  onOpen: () => void
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void
}

function WrappedBarView({
  bar,
  columnsPerRow,
  cellWidth,
  barHeight,
  top,
  sentence,
  days,
  focused,
  selected,
  onFocusItem,
  onSelect,
  onOpen,
  onKeyDown,
}: WrappedBarProps) {
  const { t } = useTranslation()
  const { row } = bar.span
  const KindIcon = EVENT_KIND_ICON[row.kind]

  const width = bar.columns * cellWidth
  const showTitle = barHeight >= WRAPPED_TEXT_BAR && width >= 64
  const showIcon = barHeight >= WRAPPED_ICON_BAR && width >= 22
  const showWebsite = Boolean(row.website_url) && showTitle && width >= 110

  return (
    <div
      {...eventColorAttrs(row.color ?? null)}
      className={styles.barSlot}
      style={{
        left: `calc(${bar.startColumn} * (100% / ${columnsPerRow}))`,
        width: `calc(${bar.columns} * (100% / ${columnsPerRow}))`,
        top,
        ['--bar-height' as string]: `${barHeight}px`,
      }}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            tabIndex={-1}
            className={styles.bar}
            data-schedule-item={bar.span.id}
            data-schedule-bar-day={days}
            data-kind={row.kind}
            data-thin={barHeight < WRAPPED_ICON_BAR ? 'true' : 'false'}
            data-clipped-start={bar.clippedStart ? 'true' : 'false'}
            data-clipped-end={bar.clippedEnd ? 'true' : 'false'}
            data-focused={focused ? 'true' : 'false'}
            data-selected={selected ? 'true' : 'false'}
            aria-current={selected ? 'true' : undefined}
            aria-label={sentence}
            onFocus={onFocusItem}
            onClick={onSelect}
            onDoubleClick={onOpen}
            onKeyDown={onKeyDown}
          >
            {showIcon && <KindIcon className={styles.barIcon} aria-hidden="true" />}
            {showTitle && <span className={styles.barTitle}>{row.title}</span>}
            {selected && <span className="sr-only">{t('schedule.selected')}</span>}
            {showWebsite && row.website_url && (
              <a
                href={row.website_url}
                target="_blank"
                rel="noreferrer noopener"
                tabIndex={-1}
                data-schedule-website={bar.span.id}
                className={styles.barWebsite}
                onClick={(event) => event.stopPropagation()}
              >
                <ExternalLink className={styles.barWebsiteIcon} aria-hidden="true" />
                <span className="sr-only">{t('schedule.openWebsite', { name: row.title })}</span>
              </a>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <BarTooltip row={row} />
        </TooltipContent>
      </Tooltip>
    </div>
  )
}
