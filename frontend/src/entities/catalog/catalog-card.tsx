import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { EVENT_STATE_KEY } from '@/entities/event/event.labels'
import { eventColorAttrs } from '@/entities/event/event-color'
import type { CatalogEvent } from '@/shared/api/types.gen'
import { cn } from '@/shared/styling/class-names/class-names'
import { TOUCH_REACH } from '@/shared/styling/touch/touch-reach'
import { ExternalLink } from '@/shared/ui/navigation/external-link/external-link'
import { CatalogCover } from './catalog-cover'
import { CatalogJoinedMark } from './catalog-joined-mark'
import { CornerArrow } from './corner-arrow'
import { EventFactRows } from './event-fact-rows'

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

export const CARD_ARROW = cn(
  'relative flex size-4 items-center justify-center rounded-control',
  TOUCH_REACH,
  'before:absolute before:-inset-2 before:content-[""]',
  'text-event-tint/70 transition-colors duration-instant ease-out hover:text-event-tint',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
)

export const CARD_GRID = cn(
  'grid grid-cols-[repeat(auto-fill,minmax(16rem,1fr))] gap-x-3 sm:gap-x-4',
)

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
  const cornerNode =
    corner ??
    (event.website_url ? (
      <ExternalLink
        href={event.website_url}
        showIcon={false}
        aria-label={t('catalog.card.websiteOf', { title: event.title })}
        className={CARD_ARROW}
      >
        <CornerArrow />
      </ExternalLink>
    ) : null)

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

        <EventFactRows
          facts={{
            startAt: event.start_at,
            endAt: event.end_at,
            format: event.effective_format,
            place: event.offline_stages?.at(-1)?.place ?? null,
            teamSizeMin: event.team_size_min,
            teamSizeMax: event.team_size_max,
            prizePool: event.prize_pool,
            prizeCurrency: event.prize_currency,
          }}
        />

        {footer ?? (
          <span className="sr-only">{t(EVENT_STATE_KEY[event.state].replace('event:', ''))}</span>
        )}
      </button>

      {cornerNode && (
        <span
          data-card-corner=""
          {...(corner ? {} : eventColorAttrs(event.color))}
          className={cn(
            'z-10 col-start-1 row-start-1 flex self-start justify-self-end',
            corner ? '-mt-0.5 -mr-0.5' : 'mt-[3.5px] mr-[3.5px]',
          )}
        >
          {cornerNode}
        </span>
      )}
    </div>
  )
}
