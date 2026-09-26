import { CalendarDays, ExternalLink as ExternalLinkIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { EVENT_STATE_KEY } from '@/entities/event/event.labels'
import { TeamSizeFigures } from '@/entities/event/team-size/team-size-figures'
import { EVENT_FORMAT_ICON, EVENT_FORMAT_KEY, placeLabel } from '@/entities/stage/stage.place'
import type { CatalogEvent } from '@/shared/api/types.gen'
import { formatDateRange } from '@/shared/datetime/datetime'
import { formatMoney } from '@/shared/money/money'
import { cn } from '@/shared/styling/class-names/class-names'
import { TOUCH_REACH } from '@/shared/styling/touch/touch-reach'
import { ExternalLink } from '@/shared/ui/navigation/external-link/external-link'
import { Badge } from '@/shared/ui/primitives/badge'
import { durationDays } from './catalog.facts'
import { CatalogCover } from './catalog-cover'
import { CatalogJoinedMark } from './catalog-joined-mark'

type ReaderOnly =
  | 'joined'
  | 'offline_stages'
  | 'registration_deadline'
  | 'registration_status'
  | 'registration_url'
  | 'team_role'

export type TileEvent = Omit<CatalogEvent, ReaderOnly> & Partial<Pick<CatalogEvent, ReaderOnly>>

export const CARD_CORNER = cn(
  'flex size-7 items-center justify-center rounded-control',
  TOUCH_REACH,
  'text-muted-foreground transition-colors duration-instant ease-out',
  'hover:bg-surface-2 hover:text-foreground',
  'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring',
)

const CORNER_SPOT = 'absolute right-3 top-[calc(1.5rem_+_(100cqw_-_1.5rem)_*_9_/_16)] flex'

function FactRow({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span aria-hidden="true" className="flex w-4 shrink-0 justify-center text-muted-foreground">
        {icon}
      </span>
      <span className="flex min-w-0 items-baseline gap-2">{children}</span>
    </span>
  )
}

function finalPlace(event: TileEvent, online: string): string | null {
  const final = event.offline_stages?.at(-1)
  return final ? placeLabel(final.place, online) : null
}

export function CatalogCard({
  event,
  selected,
  onSelect,
  corner,
  footer,
}: {
  event: TileEvent
  selected: boolean
  onSelect: (id: string) => void
  corner?: ReactNode
  footer?: ReactNode
}) {
  const { t } = useTranslation('event')
  const FormatIcon = EVENT_FORMAT_ICON[event.effective_format]
  const prize = formatMoney(event.prize_pool, event.prize_currency)
  const place = finalPlace(event, t('place.online'))
  const track =
    event.tracks.length === 1 && event.tracks[0]
      ? event.tracks[0].name
      : event.tracks.length > 1
        ? t('card.trackCount', { count: event.tracks.length })
        : null
  const cornerNode =
    corner ??
    (event.website_url ? (
      <ExternalLink
        href={event.website_url}
        showIcon={false}
        aria-label={t('catalog.card.websiteOf', { title: event.title })}
        className={CARD_CORNER}
      >
        <ExternalLinkIcon className="size-4" aria-hidden="true" />
      </ExternalLink>
    ) : null)

  return (
    <div
      className={cn(
        'group @container relative flex h-full min-w-0 flex-col rounded-surface border bg-card',
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
          'flex min-w-0 flex-1 flex-col gap-3 rounded-surface p-3 text-left',
          'focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring',
        )}
      >
        <CatalogCover coverUrl={event.cover_url} color={event.color} />

        <span className="flex min-w-0 flex-col gap-1">
          <span data-card-title="" className="block font-semibold text-screen leading-snug">
            {cornerNode && (
              <span aria-hidden="true" data-corner-room="" className="float-right ml-2 h-7 w-7" />
            )}
            {event.title}
            {event.joined && <CatalogJoinedMark className="ml-1.5 align-[-0.125em]" />}
          </span>
          {event.organizer && (
            <span className="block truncate text-caption text-muted-foreground">
              {event.organizer}
            </span>
          )}
        </span>

        <span data-card-facts="" className="mt-auto flex flex-col gap-1.5 text-meta">
          <FactRow icon={<CalendarDays className="size-3.5" />}>
            <span className="truncate font-medium">
              {formatDateRange(event.start_at, event.end_at)}
            </span>
            <span data-card-duration="" className="shrink-0 text-muted-foreground tabular-nums">
              {t('catalog.column.durationDays', {
                count: durationDays(event.start_at, event.end_at),
              })}
            </span>
          </FactRow>
          <FactRow icon={<FormatIcon className="size-3.5" />}>
            <span className="shrink-0">{t(EVENT_FORMAT_KEY[event.effective_format])}</span>
            {place && (
              <span data-card-place="" className="truncate text-muted-foreground">
                {place}
              </span>
            )}
          </FactRow>
          <TeamSizeFigures
            min={event.team_size_min}
            max={event.team_size_max}
            className="self-start"
          />
        </span>

        {(track || prize) && (
          <span
            data-card-stakes=""
            className="flex min-w-0 items-center gap-2 border-border border-t pt-2.5"
          >
            {track && (
              <Badge tone="neutral" className="min-w-0 truncate">
                {track}
              </Badge>
            )}
            {prize && (
              <span className="ml-auto shrink-0 font-semibold text-heading text-prize tabular-nums">
                {prize}
              </span>
            )}
          </span>
        )}

        {footer ?? (
          <span className="sr-only">{t(EVENT_STATE_KEY[event.state].replace('event:', ''))}</span>
        )}
      </button>

      {cornerNode && <span className={CORNER_SPOT}>{cornerNode}</span>}
    </div>
  )
}
