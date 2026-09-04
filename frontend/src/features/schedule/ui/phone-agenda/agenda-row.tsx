import { type KeyboardEvent, memo } from 'react'
import { useTranslation } from 'react-i18next'
import { eventColorAttrs } from '@/entities/event/event-color'
import { formatDateRange } from '@/shared/datetime/datetime'
import type { CalendarSpan } from '../../model/calendar-items'
import { EVENT_KIND_ICON } from '../../model/event-kind'
import styles from './agenda-row.module.css'

export const AgendaRow = memo(AgendaRowView)

export type AgendaRowProps = {
  span: CalendarSpan
  sentence: string
  selected: boolean
  days?: string
  onSelect: () => void
  onOpen: () => void
  onKeyDown?: (event: KeyboardEvent<HTMLElement>) => void
}

function AgendaRowView({
  span,
  sentence,
  selected,
  days,
  onSelect,
  onOpen,
  onKeyDown,
}: AgendaRowProps) {
  const { t } = useTranslation()
  const { row } = span
  const KindIcon = EVENT_KIND_ICON[row.kind]

  return (
    <button
      type="button"
      {...eventColorAttrs(row.color ?? null)}
      className={styles.row}
      data-schedule-item={span.id}
      data-schedule-agenda-row
      data-schedule-bar-day={days}
      data-kind={row.kind}
      tabIndex={days ? -1 : undefined}
      data-selected={selected ? 'true' : 'false'}
      aria-current={selected ? 'true' : undefined}
      aria-label={sentence}
      onClick={onSelect}
      onDoubleClick={onOpen}
      onKeyDown={onKeyDown}
    >
      <span className={styles.stripe} aria-hidden="true" />
      <span className={styles.body}>
        <span className={styles.title}>{row.title}</span>
        <span className={styles.meta}>
          <KindIcon className={styles.kindIcon} aria-hidden="true" />
          <span className={styles.dates}>{formatDateRange(row.start_at, row.end_at)}</span>
        </span>
      </span>
      {selected && <span className="sr-only">{t('schedule.selected')}</span>}
    </button>
  )
}
