import { useTranslation } from 'react-i18next'
import { EVENT_STATE_KEY } from '@/entities/event/event.labels'
import { EVENT_FORMAT_ICON, EVENT_FORMAT_KEY, placeLabel } from '@/entities/stage/stage.place'
import type { CatalogEvent } from '@/shared/api/types.gen'
import { formatDate, formatDateRange } from '@/shared/datetime/datetime'
import { cn } from '@/shared/styling/class-names/class-names'
import { Badge } from '@/shared/ui/primitives/badge'
import { CatalogKindMark } from './catalog-kind-mark'

export function CatalogPlaceLine({ event }: { event: CatalogEvent }) {
  const { t } = useTranslation('event')
  const final = event.offline_stages.at(-1)
  if (!final) return null

  return (
    <p className="truncate text-meta text-muted-foreground">
      {t('place.stageLine', {
        name: final.name,
        place: placeLabel(final.place, t('place.online')),
        date: formatDate(final.start_at),
      })}
    </p>
  )
}

export function CatalogCard({
  event,
  layout,
  selected,
  onSelect,
}: {
  event: CatalogEvent
  layout: 'list' | 'grid'
  selected: boolean
  onSelect: (id: string) => void
}) {
  const { t } = useTranslation('event')
  const FormatIcon = EVENT_FORMAT_ICON[event.effective_format]

  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      data-event-row={event.id}
      onClick={() => onSelect(event.id)}
      className={cn(
        'flex w-full min-w-0 text-left transition-colors duration-instant',
        'focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring',
        layout === 'grid'
          ? 'h-full flex-col gap-2 rounded-lg border border-border bg-card p-3'
          : 'h-row-roomy shrink-0 items-center gap-3 border-border/60 border-b px-3',
        selected ? 'bg-accent-surface' : 'hover:bg-surface-3',
      )}
    >
      <span
        className={cn(
          'flex min-w-0 items-center gap-2',
          layout === 'grid' ? 'w-full' : 'min-w-0 flex-1',
        )}
      >
        <CatalogKindMark kind={event.kind} />
        <span className="min-w-0 flex-1 truncate font-medium text-copy">{event.title}</span>
        {event.joined && (
          <Badge tone="primary" className="shrink-0">
            {t('catalog.joined')}
          </Badge>
        )}
      </span>

      <span
        className={cn(
          'flex min-w-0 items-center gap-2 text-meta text-muted-foreground',
          layout === 'grid' ? 'w-full' : 'hidden shrink-0 md:flex',
        )}
      >
        <FormatIcon className="size-3 shrink-0" aria-hidden="true" />
        <span className="truncate">{t(EVENT_FORMAT_KEY[event.effective_format])}</span>
        <span aria-hidden="true">·</span>
        <span className="truncate">{formatDateRange(event.start_at, event.end_at)}</span>
      </span>

      {layout === 'grid' && (
        <>
          <CatalogPlaceLine event={event} />
          {event.prize_pool && event.prize_currency && (
            <span className="text-meta text-muted-foreground">
              {t('place.prizePool')}: {event.prize_pool} {event.prize_currency}
            </span>
          )}
        </>
      )}

      <span className="sr-only">{t(EVENT_STATE_KEY[event.state].replace('event:', ''))}</span>
    </button>
  )
}
