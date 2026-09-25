import { useTranslation } from 'react-i18next'
import { CatalogCover } from '@/entities/catalog/catalog-cover'
import { CatalogKindMark } from '@/entities/catalog/catalog-kind-mark'
import { EVENT_STATE_KEY } from '@/entities/event/event.labels'
import {
  EVENT_STATE_TEXT,
  EventStateSign,
} from '@/entities/event/event-state-mark/event-state-sign'
import { EVENT_FORMAT_ICON, EVENT_FORMAT_KEY } from '@/entities/stage/stage.place'
import type { EventResponse } from '@/shared/api/types.gen'
import { formatDateRange, formatDateTime } from '@/shared/datetime/datetime'
import { formatMoney } from '@/shared/money/money'
import { cn } from '@/shared/styling/class-names/class-names'
import { ModerationMenu } from './moderation-menu'

function AdminCard({
  event,
  selected,
  onSelect,
}: {
  event: EventResponse
  selected: boolean
  onSelect: (id: string) => void
}) {
  const { t } = useTranslation('event')
  const FormatIcon = EVENT_FORMAT_ICON[event.effective_format]
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
        <CatalogCover coverUrl={event.cover_url} color={event.color} />

        <span className="flex min-w-0 items-center gap-2">
          <CatalogKindMark kind={event.kind} />
          <span className="min-w-0 flex-1 truncate font-medium text-copy">{event.title}</span>
        </span>

        <span className="flex min-w-0 items-center gap-2 text-caption text-muted-foreground">
          <FormatIcon className="size-3 shrink-0" aria-hidden="true" />
          <span className="truncate">{t(EVENT_FORMAT_KEY[event.effective_format])}</span>
        </span>

        <span className="block truncate text-caption text-muted-foreground">
          {formatDateRange(event.start_at, event.end_at)}
        </span>

        <span className="mt-auto flex min-w-0 items-center justify-between gap-2 pt-1">
          <span
            className={cn('flex items-center gap-1.5 text-caption', EVENT_STATE_TEXT[event.state])}
          >
            <EventStateSign state={event.state} />
            <span className="truncate">
              {t(EVENT_STATE_KEY[event.state].replace('event:', ''))}
            </span>
          </span>
          {prize && <span className="font-medium text-caption text-prize">{prize}</span>}
        </span>

        <span className="block truncate text-caption text-muted-foreground">
          {t('catalog.column.updatedAt', { at: formatDateTime(event.updated_at) })}
        </span>
      </button>

      <span className="absolute top-2 right-2">
        <ModerationMenu event={event} />
      </span>
    </div>
  )
}

export function AdminCards({
  items,
  selected,
  onSelect,
}: {
  items: EventResponse[]
  selected: string | null
  onSelect: (id: string) => void
}) {
  const { t } = useTranslation('event')

  return (
    <div
      role="listbox"
      aria-label={t('list.adminTitle')}
      className="grid grid-cols-[repeat(auto-fill,minmax(16rem,1fr))] gap-3 sm:gap-4"
    >
      {items.map((item) => (
        <AdminCard key={item.id} event={item} selected={item.id === selected} onSelect={onSelect} />
      ))}
    </div>
  )
}
