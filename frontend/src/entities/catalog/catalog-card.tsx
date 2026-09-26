import { ArrowUpRight, CalendarDays } from 'lucide-react'
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
  'flex size-8 items-center justify-center rounded-control',
  TOUCH_REACH,
  'text-muted-foreground transition-colors duration-instant ease-out',
  'hover:text-foreground',
  'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring',
)

export const CARD_GRID = cn(
  'grid grid-cols-[repeat(auto-fill,minmax(16rem,1fr))] gap-x-3 sm:gap-x-4',
)

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
  const cornerNode =
    corner ??
    (event.website_url ? (
      <ExternalLink
        href={event.website_url}
        showIcon={false}
        aria-label={t('catalog.card.websiteOf', { title: event.title })}
        className={CARD_CORNER}
      >
        <ArrowUpRight className="size-6" strokeWidth={2.5} aria-hidden="true" />
      </ExternalLink>
    ) : null)

  const hasTeam = event.team_size_min !== undefined || event.team_size_max !== undefined

  return (
    <div
      data-card-rows={footer ? 4 : 3}
      className={cn(
        'group relative mb-3 grid min-w-0 grid-rows-subgrid gap-y-2.5 sm:mb-4',
        footer ? 'row-span-4' : 'row-span-3',
        'rounded-surface border bg-card',
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
          'col-start-1 row-start-1 grid min-w-0 grid-rows-subgrid rounded-surface p-3 text-left',
          footer ? 'row-span-4' : 'row-span-3',
          'focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring',
        )}
      >
        <CatalogCover coverUrl={event.cover_url} color={event.color} />

        <span data-card-heading="" className="flex min-w-0 flex-col gap-0.5">
          <span data-card-title="" className="block font-semibold text-screen leading-snug">
            {event.title}
            {event.joined && <CatalogJoinedMark className="ml-1.5 align-[-0.125em]" />}
          </span>
          {event.organizer && (
            <span className="block truncate text-caption text-muted-foreground">
              {event.organizer}
            </span>
          )}
        </span>

        <span data-card-facts="" className="flex min-w-0 flex-col gap-1 text-meta">
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
          {(hasTeam || prize) && (
            <span data-card-stakes="" className="flex min-h-6 min-w-0 items-center gap-2">
              <TeamSizeFigures min={event.team_size_min} max={event.team_size_max} />
              {prize && (
                <span className="ml-auto shrink-0 font-semibold text-heading text-prize tabular-nums">
                  {prize}
                </span>
              )}
            </span>
          )}
        </span>

        {footer ?? (
          <span className="sr-only">{t(EVENT_STATE_KEY[event.state].replace('event:', ''))}</span>
        )}
      </button>

      {cornerNode && (
        <span
          data-card-corner=""
          className="z-10 col-start-1 row-start-1 -mt-0.5 -mr-0.5 flex self-start justify-self-end"
        >
          {cornerNode}
        </span>
      )}
    </div>
  )
}
