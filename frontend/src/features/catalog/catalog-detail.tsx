import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { CatalogKindMark } from '@/entities/catalog/catalog-kind-mark'
import { EVENT_STATE_KEY } from '@/entities/event/event.labels'
import { EVENT_FORMAT_ICON, EVENT_FORMAT_KEY, placeLabel } from '@/entities/stage/stage.place'
import type { CatalogEvent } from '@/shared/api/types.gen'
import { formatDate, formatDateRange } from '@/shared/datetime/datetime'
import { ExternalLink } from '@/shared/ui/navigation/external-link/external-link'
import { Badge } from '@/shared/ui/primitives/badge'
import { Button } from '@/shared/ui/primitives/button'
import { JoinEventDialog } from './join-event-dialog'

export function CatalogDetail({
  event,
  joining,
  onJoin,
  onJoinClose,
  onClose,
}: {
  event: CatalogEvent
  joining: boolean
  onJoin: () => void
  onJoinClose: () => void
  onClose: () => void
}) {
  const { t } = useTranslation('event')
  const FormatIcon = EVENT_FORMAT_ICON[event.effective_format]
  const derived = event.effective_format !== event.format
  const finished = event.state === 'FINISHED'

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-start gap-2">
        <CatalogKindMark kind={event.kind} className="mt-1.5" />
        <h2 id="catalog-detail-title" className="min-w-0 flex-1 font-semibold text-heading">
          {event.title}
        </h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          {t('detail.close')}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="outline">
          <FormatIcon className="size-3" aria-hidden="true" />
          {t(EVENT_FORMAT_KEY[event.effective_format])}
        </Badge>
        <Badge tone="neutral">{t(EVENT_STATE_KEY[event.state].replace('event:', ''))}</Badge>
        {event.joined && <Badge tone="primary">{t('catalog.joined')}</Badge>}
      </div>

      {derived && <p className="text-meta text-muted-foreground">{t('place.derivedHint')}</p>}

      <p className="text-copy">{formatDateRange(event.start_at, event.end_at)}</p>

      {event.offline_stages.length > 0 && (
        <div className="flex flex-col gap-1">
          {event.offline_stages.map((stage) => (
            <p key={stage.id} className="text-meta">
              {t('place.stageLine', {
                name: stage.name,
                place: placeLabel(stage.place, t('place.online')),
                date: formatDate(stage.start_at),
              })}
            </p>
          ))}
        </div>
      )}

      <dl className="flex flex-col gap-1 text-meta">
        {event.organizer && (
          <div className="flex gap-2">
            <dt className="text-muted-foreground">{t('form.organizer')}:</dt>
            <dd>{event.organizer}</dd>
          </div>
        )}
        {event.track && (
          <div className="flex gap-2">
            <dt className="text-muted-foreground">{t('place.track')}:</dt>
            <dd>{event.track}</dd>
          </div>
        )}
        {event.prize_pool && event.prize_currency && (
          <div className="flex gap-2">
            <dt className="text-muted-foreground">{t('place.prizePool')}:</dt>
            <dd>
              {event.prize_pool} {event.prize_currency}
            </dd>
          </div>
        )}
        {event.team_size_max && (
          <div className="flex gap-2">
            <dt className="text-muted-foreground">{t('place.teamSizeMax')}:</dt>
            <dd>{event.team_size_max}</dd>
          </div>
        )}
      </dl>

      {event.description && <p className="text-copy">{event.description}</p>}

      <div className="flex flex-wrap items-center gap-2">
        {event.joined ? (
          <Button variant="outline" asChild>
            <Link to={`/events/${event.id}`}>{t('detail.openFull')}</Link>
          </Button>
        ) : (
          <Button onClick={onJoin} disabled={finished}>
            {t('catalog.join.action')}
          </Button>
        )}
        {event.website_url && (
          <Button variant="ghost" asChild>
            <ExternalLink href={event.website_url}>{t('card.website')}</ExternalLink>
          </Button>
        )}
      </div>

      {finished && !event.joined && (
        <p className="text-meta text-muted-foreground">{t('catalog.join.finished')}</p>
      )}

      <JoinEventDialog
        event={event}
        open={joining}
        onOpenChange={(open) => !open && onJoinClose()}
      />
    </div>
  )
}
