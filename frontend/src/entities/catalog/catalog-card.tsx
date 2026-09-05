import { ArrowUpRight, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { EVENT_STATE_KEY } from '@/entities/event/event.labels'
import { EVENT_FORMAT_ICON, EVENT_FORMAT_KEY, placeLabel } from '@/entities/stage/stage.place'
import type { CatalogEvent } from '@/shared/api/types.gen'
import { formatDate, formatDateRange } from '@/shared/datetime/datetime'
import { formatMoney } from '@/shared/money/money'
import { cn } from '@/shared/styling/class-names/class-names'
import { ExternalLink } from '@/shared/ui/navigation/external-link/external-link'
import { Badge } from '@/shared/ui/primitives/badge'
import { teamSizeLabelKey } from './catalog.facts'
import { CatalogCover } from './catalog-cover'
import { CatalogJoinedMark } from './catalog-joined-mark'
import { CatalogKindMark } from './catalog-kind-mark'

function PlaceLine({ event }: { event: CatalogEvent }) {
  const { t } = useTranslation('event')
  const final = event.offline_stages.at(-1)
  if (!final) return null

  return (
    <span className="block truncate text-caption text-muted-foreground">
      {t('place.stageLine', {
        name: final.name,
        place: placeLabel(final.place, t('place.online')),
        date: formatDate(final.start_at),
      })}
    </span>
  )
}

export function CatalogCard({
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
  const teamSize = teamSizeLabelKey(event)
  const prize = formatMoney(event.prize_pool, event.prize_currency)

  return (
    <div
      className={cn(
        'group relative flex h-full min-w-0 flex-col rounded-surface border bg-card',
        'motion-safe:animate-stage-in',
        'motion-safe:transition-[border-color,box-shadow,transform] motion-safe:duration-base',
        'motion-safe:ease-out',
        'focus-within:border-ring hover:motion-safe:-translate-y-0.5 hover:shadow-lifted',
        selected ? 'border-ring shadow-raised' : 'border-border',
      )}
    >
      <button
        type="button"
        role="option"
        aria-selected={selected}
        data-event-row={event.id}
        onClick={() => onSelect(event.id)}
        className={cn(
          'flex min-w-0 flex-1 flex-col gap-2.5 rounded-surface p-3 text-left',
          'focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring',
        )}
      >
        <CatalogCover
          coverUrl={event.cover_url}
          color={event.color}
          initial={event.title.slice(0, 1)}
          className="aspect-[16/9] shrink-0"
        />

        <span className="flex min-w-0 items-start gap-2">
          <CatalogKindMark kind={event.kind} className="mt-0.5" />
          <span className="min-w-0 flex-1 font-semibold text-screen leading-snug [text-wrap:balance]">
            {event.title}
          </span>
          {event.joined && <CatalogJoinedMark className="mt-0.5" />}
        </span>

        {event.organizer && (
          <span className="-mt-1 block truncate text-caption text-muted-foreground">
            {event.organizer}
          </span>
        )}

        <span className="mt-auto flex flex-col gap-1 pt-0.5">
          <span className="flex min-w-0 items-center gap-1.5 text-meta">
            <FormatIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="shrink-0 text-muted-foreground">
              {t(EVENT_FORMAT_KEY[event.effective_format])}
            </span>
            <span aria-hidden="true" className="shrink-0 text-faint-foreground">
              ·
            </span>
            <span className="truncate font-medium">
              {formatDateRange(event.start_at, event.end_at)}
            </span>
          </span>

          <PlaceLine event={event} />

          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-1">
            {event.tracks.length > 0 && (
              <Badge tone="neutral" className="max-w-full truncate">
                {event.tracks.length === 1 && event.tracks[0]
                  ? event.tracks[0].name
                  : t('card.trackCount', { count: event.tracks.length })}
              </Badge>
            )}
            {teamSize && (
              <span className="inline-flex items-center gap-1 text-caption text-muted-foreground">
                <Users className="size-3 shrink-0" aria-hidden="true" />
                {t(teamSize.key, teamSize.values)}
              </span>
            )}
            {prize && (
              <span className="ml-auto font-semibold text-heading text-prize tabular-nums">
                {prize}
              </span>
            )}
          </span>
        </span>

        <span className="sr-only">{t(EVENT_STATE_KEY[event.state].replace('event:', ''))}</span>
      </button>

      {event.website_url && (
        <ExternalLink
          href={event.website_url}
          showIcon={false}
          aria-label={t('catalog.card.websiteOf', { title: event.title })}
          className={cn(
            'absolute top-3 right-3 flex size-11 items-center justify-center rounded-control',
            'sm:top-4 sm:right-4 sm:size-7',
            'border border-border bg-card/90 text-muted-foreground backdrop-blur-sm',
            'transition-colors duration-instant ease-out',
            'hover:bg-accent-surface hover:text-accent-surface-foreground',
            'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring',
          )}
        >
          <ArrowUpRight className="size-4" aria-hidden="true" />
        </ExternalLink>
      )}
    </div>
  )
}
