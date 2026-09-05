import { useTranslation } from 'react-i18next'
import { EVENT_STATE_KEY } from '@/entities/event/event.labels'
import {
  EVENT_STATE_TEXT,
  EventStateSign,
} from '@/entities/event/event-state-mark/event-state-sign'
import { EVENT_FORMAT_ICON, EVENT_FORMAT_KEY, placeLabel } from '@/entities/stage/stage.place'
import type { CatalogEvent } from '@/shared/api/types.gen'
import { formatDateRange } from '@/shared/datetime/datetime'
import { formatMoney } from '@/shared/money/money'
import { cn } from '@/shared/styling/class-names/class-names'
import { NoValue } from '@/shared/ui/data-display/no-value/no-value'
import { teamSizeLabelKey } from './catalog.facts'
import { CATALOG_SCOPE_KEY, type CatalogColumn } from './catalog.views'
import { CatalogJoinedMark } from './catalog-joined-mark'
import { CatalogKindMark } from './catalog-kind-mark'

function TitleCell({
  event,
  selected,
  onSelect,
}: {
  event: CatalogEvent
  selected: boolean
  onSelect: (id: string) => void
}) {
  const { t } = useTranslation('event')

  return (
    <td className="w-full max-w-0 px-3 py-2 pointer-coarse:py-0">
      <span className="flex min-w-0 items-center gap-2 pointer-coarse:h-11">
        <CatalogKindMark kind={event.kind} />
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
        {event.joined && <CatalogJoinedMark />}
      </span>
      {selected && <span className="sr-only">{t('catalog.selected')}</span>}
    </td>
  )
}

function CellContent({ event, column }: { event: CatalogEvent; column: CatalogColumn }) {
  const { t } = useTranslation('event')
  const FormatIcon = EVENT_FORMAT_ICON[event.effective_format]
  const stage = event.offline_stages.at(-1)

  switch (column) {
    case 'kind':
      return <>{t(`catalog.kindLabel.${event.kind}`)}</>
    case 'format':
      return (
        <span className="flex items-center gap-1.5">
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
    case 'period':
      return <>{formatDateRange(event.start_at, event.end_at)}</>
    case 'prize': {
      const prize = formatMoney(event.prize_pool, event.prize_currency)
      return prize ? <span className="font-medium text-prize">{prize}</span> : <NoValue />
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
    case 'teamSize': {
      const size = teamSizeLabelKey(event)
      return <>{size ? t(size.key, size.values) : <NoValue />}</>
    }
    case 'participation':
      return event.joined ? (
        <span className="flex items-center gap-1.5">
          <CatalogJoinedMark />
          <span className="truncate">{event.team_role ?? t('catalog.column.participation')}</span>
        </span>
      ) : (
        <NoValue />
      )
    case 'origin':
      return <>{t(CATALOG_SCOPE_KEY[event.origin])}</>
    case 'state':
      return (
        <span className={cn('flex items-center gap-1.5', EVENT_STATE_TEXT[event.state])}>
          {event.state === 'ACTIVE' && <EventStateSign state={event.state} />}
          <span className="truncate">{t(EVENT_STATE_KEY[event.state].replace('event:', ''))}</span>
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
          <TitleCell key={column} event={event} selected={selected} onSelect={onSelect} />
        ) : (
          <td key={column} className={cellClass(column)}>
            <CellContent event={event} column={column} />
          </td>
        ),
      )}
    </tr>
  )
}
