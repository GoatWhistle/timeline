import { useTranslation } from 'react-i18next'
import { CARD_CORNER, CatalogCard } from '@/entities/catalog/catalog-card'
import { EVENT_STATE_KEY } from '@/entities/event/event.labels'
import {
  EVENT_STATE_TEXT,
  EventStateSign,
} from '@/entities/event/event-state-mark/event-state-sign'
import type { EventResponse } from '@/shared/api/types.gen'
import { formatDate, formatDateTime } from '@/shared/datetime/datetime'
import { cn } from '@/shared/styling/class-names/class-names'
import { ModerationMenu } from './moderation-menu'

export function AdminFacts({ event }: { event: EventResponse }) {
  const { t } = useTranslation('event')

  return (
    <span
      data-admin-facts=""
      className="flex flex-col gap-1 border-border border-t pt-2.5 text-caption"
    >
      <span className="flex min-w-0 items-center justify-between gap-2">
        <span className={cn('flex min-w-0 items-center gap-1.5', EVENT_STATE_TEXT[event.state])}>
          <EventStateSign state={event.state} />
          <span className="truncate">{t(EVENT_STATE_KEY[event.state].replace('event:', ''))}</span>
        </span>
        <span className="shrink-0 text-muted-foreground">
          {event.published_at
            ? t('catalog.card.publishedAt', { at: formatDate(event.published_at) })
            : t('catalog.column.notPublished')}
        </span>
      </span>
      <span className="truncate text-muted-foreground">
        {t('catalog.column.updatedAt', { at: formatDateTime(event.updated_at) })}
      </span>
      {event.purge_scheduled_at && (
        <span className="truncate text-destructive">
          {t('catalog.card.purgeAt', { at: formatDate(event.purge_scheduled_at) })}
        </span>
      )}
    </span>
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
        <CatalogCard
          key={item.id}
          event={item}
          selected={item.id === selected}
          onSelect={onSelect}
          corner={<ModerationMenu event={item} className={CARD_CORNER} />}
          footer={<AdminFacts event={item} />}
        />
      ))}
    </div>
  )
}
