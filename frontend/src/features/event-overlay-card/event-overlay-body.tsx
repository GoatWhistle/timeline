import { Globe } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { EventColorMark, eventColorAttrs } from '@/entities/event/event-color'
import { EventStateBadge } from '@/entities/event/event-state-badge'
import { EventCover } from '@/features/event-cover'
import { formatDateRange } from '@/shared/datetime/datetime'
import { ExternalLink } from '@/shared/ui/navigation/external-link/external-link'
import { Badge } from '@/shared/ui/primitives/badge'
import { Button } from '@/shared/ui/primitives/button'
import { OverlayFactList } from './overlay-facts'
import type { OverlayCard } from './overlay-model'

export function EventOverlayBody({
  card,
  canOpenAdmin,
  actions,
}: {
  card: OverlayCard
  canOpenAdmin: boolean
  actions?: ReactNode
}) {
  const { t } = useTranslation('event')

  return (
    <div className="flex flex-col gap-4">
      <div {...eventColorAttrs(card.color)} className="flex flex-col gap-3">
        <EventCover
          coverUrl={card.coverUrl}
          title={card.title}
          className="aspect-[3/1] w-full border-event-tint"
        />

        <div className="flex flex-wrap items-center gap-2">
          <EventColorMark color={card.color} />
          <EventStateBadge state={card.state} />
          <Badge className="border-transparent bg-event-fill text-event-tint">
            {formatDateRange(card.startAt, card.endAt)}
          </Badge>
        </div>
      </div>

      {card.description && (
        <p className="max-w-prose text-copy [text-wrap:pretty]">{card.description}</p>
      )}

      <OverlayFactList facts={card.facts} />

      <div className="flex flex-wrap items-center gap-2 border-border border-t pt-4">
        {actions}
        {card.joined && (
          <Button asChild>
            <Link to={`/events/${card.id}`}>{t('overlay.openFull')}</Link>
          </Button>
        )}
        {canOpenAdmin && (
          <Button asChild variant="outline">
            <Link to={`/admin/events/${card.id}`}>{t('overlay.openAdmin')}</Link>
          </Button>
        )}
        {card.websiteUrl && (
          <Button asChild variant="ghost" size="icon" aria-label={t('card.website')}>
            <ExternalLink href={card.websiteUrl} showIcon={false} title={t('card.website')}>
              <Globe className="size-4" aria-hidden="true" />
            </ExternalLink>
          </Button>
        )}
      </div>
    </div>
  )
}
