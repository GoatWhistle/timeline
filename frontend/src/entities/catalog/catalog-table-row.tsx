import { useTranslation } from 'react-i18next'
import { EVENT_STATE_KEY } from '@/entities/event/event.labels'
import { EVENT_STATE_TEXT } from '@/entities/event/event-state-mark/event-state-sign'
import { EVENT_FORMAT_ICON, EVENT_FORMAT_KEY, placeLabel } from '@/entities/stage/stage.place'
import type { CatalogEvent, EventResponse } from '@/shared/api/types.gen'
import { formatEventDay } from '@/shared/datetime/datetime'
import { formatMoney } from '@/shared/money/money'
import { cn } from '@/shared/styling/class-names/class-names'
import { NoValue } from '@/shared/ui/data-display/no-value/no-value'
import { durationDays } from './catalog.facts'
import { CATALOG_SCOPE_KEY, type CatalogColumn } from './catalog.views'
import { CatalogJoinedMark } from './catalog-joined-mark'

type RowEvent = CatalogEvent | EventResponse

function joinedOf(event: RowEvent): boolean {
  return 'joined' in event && event.joined === true
}

export function CatalogTitleCell({
  event,
  selected,
  onSelect,
}: {
  event: RowEvent
  selected: boolean
  onSelect: (id: string) => void
}) {
  const { t } = useTranslation('event')

  return (
    <td data-lead="" className="h-row-roomy px-3 py-2 pointer-coarse:py-0">
      <span className="flex min-w-0 items-center gap-2 pointer-coarse:h-11">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onSelect(event.id)
          }}
          className={cn(
            'min-w-0 truncate text-left font-medium text-copy',
            'pointer-coarse:self-stretch',
            'focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring',
          )}
        >
          {event.title}
        </button>
        {joinedOf(event) && <CatalogJoinedMark />}
      </span>
      {selected && <span className="sr-only">{t('catalog.selected')}</span>}
    </td>
  )
}

const NUMBER_BOX = 'inline-block w-[3ch] text-right tabular-nums'

function CountBox({ value }: { value: number | undefined }) {
  return (
    <span data-number-box="" className={NUMBER_BOX}>
      {value === undefined ? <NoValue /> : value}
    </span>
  )
}

function DurationCell({ days }: { days: number }) {
  const { t } = useTranslation('event')
  return (
    <span data-number-box="" className="inline-flex items-baseline gap-1">
      <span className={NUMBER_BOX}>{days}</span>
      <span className="min-w-[5ch] text-left">
        {t('catalog.column.durationUnit', { count: days })}
      </span>
    </span>
  )
}

export function CatalogCellContent({ event, column }: { event: RowEvent; column: string }) {
  const { t } = useTranslation('event')
  const FormatIcon = EVENT_FORMAT_ICON[event.effective_format]
  const stage = 'offline_stages' in event ? event.offline_stages.at(-1) : undefined

  switch (column) {
    case 'kind':
      return <>{t(`catalog.kindLabel.${event.kind}`)}</>
    case 'format':
      return (
        <span className="inline-flex max-w-full items-center gap-1.5 align-middle">
          <FormatIcon className="size-3 shrink-0" aria-hidden="true" />
          <span className="truncate">{t(EVENT_FORMAT_KEY[event.effective_format])}</span>
        </span>
      )
    case 'place':
      return (
        <span className="block truncate">
          {stage ? placeLabel(stage.place, t('place.online')) : <NoValue />}
        </span>
      )
    case 'start':
      return <span className="tabular-nums">{formatEventDay(event.start_at)}</span>
    case 'end':
      return <span className="tabular-nums">{formatEventDay(event.end_at)}</span>
    case 'duration':
      return <DurationCell days={durationDays(event.start_at, event.end_at)} />
    case 'prize': {
      const prize = formatMoney(event.prize_pool, event.prize_currency)
      return prize ? (
        <span
          data-number-box=""
          className="inline-block min-w-[9ch] text-right font-medium text-prize tabular-nums"
        >
          {prize}
        </span>
      ) : (
        <NoValue />
      )
    }
    case 'organizer':
      return <span className="block truncate">{event.organizer ?? <NoValue />}</span>
    case 'track':
      return (
        <span className="block truncate">
          {event.tracks.length > 0 ? (
            event.tracks.map((track) => track.name).join(', ')
          ) : (
            <NoValue />
          )}
        </span>
      )
    case 'tracks':
      return <CountBox value={event.tracks.length || undefined} />
    case 'teamMin':
      return <CountBox value={event.team_size_min} />
    case 'teamMax':
      return <CountBox value={event.team_size_max} />
    case 'participation': {
      if (!joinedOf(event)) return <NoValue />
      const role = 'team_role' in event ? event.team_role : null
      return (
        <span className="inline-flex max-w-full items-center gap-1.5 align-middle">
          <CatalogJoinedMark />
          <span className="truncate">{role ?? t('catalog.column.participation')}</span>
        </span>
      )
    }
    case 'origin':
      return <>{t(CATALOG_SCOPE_KEY[event.origin])}</>
    case 'state':
      return (
        <span data-state-cell="" className={cn('block truncate', EVENT_STATE_TEXT[event.state])}>
          {t(EVENT_STATE_KEY[event.state].replace('event:', ''))}
        </span>
      )
    default:
      return null
  }
}

export function CatalogTableRow({
  event,
  columns,
  cellClass,
  selected,
  onSelect,
}: {
  event: CatalogEvent
  columns: CatalogColumn[]
  cellClass: (column: CatalogColumn) => string
  selected: boolean
  onSelect: (id: string) => void
}) {
  return (
    <tr
      data-event-row={event.id}
      aria-selected={selected}
      onClick={() => onSelect(event.id)}
      className={cn(
        'cursor-pointer border-border/60 border-b',
        'transition-colors duration-instant ease-out',
        'focus-within:bg-surface-2',
        selected ? 'bg-accent-surface' : 'hover:bg-surface-2',
      )}
    >
      {columns.map((column) =>
        column === 'title' ? (
          <CatalogTitleCell key={column} event={event} selected={selected} onSelect={onSelect} />
        ) : (
          <td key={column} className={cellClass(column)}>
            <CatalogCellContent event={event} column={column} />
          </td>
        ),
      )}
    </tr>
  )
}
