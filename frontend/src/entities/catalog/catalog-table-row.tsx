import { useTranslation } from 'react-i18next'
import {
  EVENT_STATE_COLOR,
  EVENT_STATE_KEY,
  EVENT_STATE_SHAPE,
} from '@/entities/event/event.labels'
import { EVENT_FORMAT_ICON, EVENT_FORMAT_KEY, placeLabel } from '@/entities/stage/stage.place'
import type { CatalogEvent } from '@/shared/api/types.gen'
import { formatDateRange } from '@/shared/datetime/datetime'
import { cn } from '@/shared/styling/class-names/class-names'
import { Badge } from '@/shared/ui/primitives/badge'
import { Dot } from '@/shared/ui/primitives/dot'
import { CATALOG_SCOPE_KEY, type CatalogColumn } from './catalog.views'
import { CatalogKindMark } from './catalog-kind-mark'

const DASH = '—'

function prizeLabel(event: CatalogEvent): string | null {
  if (!event.prize_pool || !event.prize_currency) return null
  const amount = Number(event.prize_pool)
  const formatted = Number.isFinite(amount) ? amount.toLocaleString() : event.prize_pool
  return `${formatted} ${event.prize_currency}`
}

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
    <td className="w-full max-w-0 px-3 py-2">
      <span className="flex min-w-0 items-center gap-2">
        <CatalogKindMark kind={event.kind} />
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onSelect(event.id)
          }}
          className={cn(
            'min-w-0 truncate text-left font-medium text-copy',
            'focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring',
          )}
        >
          {event.title}
        </button>
        {event.joined && (
          <Badge tone="primary" className="shrink-0">
            {t('catalog.joined')}
          </Badge>
        )}
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
          {stage ? placeLabel(stage.place, t('place.online')) : DASH}
        </span>
      )
    case 'period':
      return <>{formatDateRange(event.start_at, event.end_at)}</>
    case 'prize':
      return <>{prizeLabel(event) ?? DASH}</>
    case 'organizer':
      return <span className="block truncate">{event.organizer ?? DASH}</span>
    case 'track':
      return <span className="block truncate">{event.track ?? DASH}</span>
    case 'teamSize':
      return <>{event.team_size_max ?? DASH}</>
    case 'origin':
      return <>{t(CATALOG_SCOPE_KEY[event.origin])}</>
    case 'state':
      return (
        <span className="flex items-center gap-1.5">
          <Dot shape={EVENT_STATE_SHAPE[event.state]} className={EVENT_STATE_COLOR[event.state]} />
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
        'cursor-pointer border-border/60 border-b transition-colors duration-instant',
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
