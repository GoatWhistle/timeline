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
import { CatalogKindMark } from './catalog-kind-mark'

function prizeLabel(event: CatalogEvent): string | null {
  if (!event.prize_pool || !event.prize_currency) return null
  const amount = Number(event.prize_pool)
  const formatted = Number.isFinite(amount) ? amount.toLocaleString() : event.prize_pool
  return `${formatted} ${event.prize_currency}`
}

export function CatalogTableRow({
  event,
  selected,
  onSelect,
}: {
  event: CatalogEvent
  selected: boolean
  onSelect: (id: string) => void
}) {
  const { t } = useTranslation('event')
  const FormatIcon = EVENT_FORMAT_ICON[event.effective_format]
  const stage = event.offline_stages.at(-1)
  const prize = prizeLabel(event)
  const stateKey = EVENT_STATE_KEY[event.state].replace('event:', '')

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
        {event.organizer && (
          <span className="block truncate pl-6 text-meta text-muted-foreground">
            {event.organizer}
          </span>
        )}
      </td>

      <td className="hidden px-3 py-2 text-meta text-muted-foreground lg:table-cell">
        <span className="flex items-center gap-1.5">
          <FormatIcon className="size-3 shrink-0" aria-hidden="true" />
          <span className="truncate">{t(EVENT_FORMAT_KEY[event.effective_format])}</span>
        </span>
      </td>

      <td className="hidden max-w-48 px-3 py-2 text-meta text-muted-foreground xl:table-cell">
        <span className="block truncate">
          {stage ? placeLabel(stage.place, t('place.online')) : '—'}
        </span>
      </td>

      <td className="whitespace-nowrap px-3 py-2 text-meta text-muted-foreground tabular-nums">
        {formatDateRange(event.start_at, event.end_at)}
      </td>

      <td className="hidden whitespace-nowrap px-3 py-2 text-right text-meta tabular-nums md:table-cell">
        {prize ?? <span className="text-muted-foreground">—</span>}
      </td>

      <td className="px-3 py-2">
        <span className="flex items-center gap-1.5 text-meta text-muted-foreground">
          <Dot shape={EVENT_STATE_SHAPE[event.state]} className={EVENT_STATE_COLOR[event.state]} />
          <span className="truncate">{t(stateKey)}</span>
        </span>
      </td>
    </tr>
  )
}
