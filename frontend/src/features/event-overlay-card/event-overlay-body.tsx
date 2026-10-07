import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { CARD_ARROW } from '@/entities/catalog/catalog-card'
import { CatalogCover } from '@/entities/catalog/catalog-cover'
import { CornerArrow } from '@/entities/catalog/corner-arrow'
import { eventColorAttrs } from '@/entities/event/event-color'
import { ExternalLink } from '@/shared/ui/navigation/external-link/external-link'
import { Button } from '@/shared/ui/primitives/button'
import { OverlayFactList, OverlayTracks } from './overlay-facts'
import type { OverlayCard } from './overlay-model'

export function EventSummary({
  card,
  coverClassName = 'aspect-[5/2]',
}: {
  card: OverlayCard
  coverClassName?: string
}) {
  const { t } = useTranslation('event')

  return (
    <div className="flex flex-col gap-4">
      <div {...eventColorAttrs(card.color)} data-overlay-cover="" className="relative">
        <CatalogCover coverUrl={card.coverUrl} color={card.color} className={coverClassName} />
        {card.websiteUrl && (
          <span data-card-corner="" className="absolute -top-[8.5px] -right-[8.5px] z-10 flex">
            <ExternalLink
              href={card.websiteUrl}
              showIcon={false}
              aria-label={t('catalog.card.websiteOf', { title: card.title })}
              className={CARD_ARROW}
            >
              <CornerArrow />
            </ExternalLink>
          </span>
        )}
      </div>

      {card.organizer && (
        <span className="-mt-1 truncate text-caption text-muted-foreground">{card.organizer}</span>
      )}

      <OverlayFactList
        facts={card.facts}
        state={card.state}
        startAt={card.startAt}
        endAt={card.endAt}
      />

      {card.description && (
        <p className="max-w-prose text-copy [text-wrap:pretty]">{card.description}</p>
      )}

      <OverlayTracks facts={card.facts} />
    </div>
  )
}

export function EventOverlayBody({
  card,
  canOpenAdmin,
}: {
  card: OverlayCard
  canOpenAdmin: boolean
}) {
  const { t } = useTranslation('event')

  return (
    <div className="flex flex-col gap-4">
      <EventSummary card={card} />

      <div
        data-overlay-actions=""
        className="flex flex-wrap items-center justify-end gap-2 border-border border-t pt-4"
      >
        {canOpenAdmin && (
          <Button asChild variant="outline">
            <Link to={`/admin/events/${card.id}`}>{t('overlay.openAdmin')}</Link>
          </Button>
        )}
        <Button asChild>
          <Link to={`/events/${card.id}`}>{t('overlay.openFull')}</Link>
        </Button>
      </div>
    </div>
  )
}
