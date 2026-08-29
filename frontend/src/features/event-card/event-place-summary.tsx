import { useTranslation } from 'react-i18next'
import {
  EVENT_FORMAT_ICON,
  EVENT_FORMAT_KEY,
  isOffline,
  placeLabel,
} from '@/entities/stage/stage.place'
import type { EventResponse, StageResponse } from '@/shared/api/types.gen'
import { formatDate } from '@/shared/datetime/datetime'
import { Badge } from '@/shared/ui/primitives/badge'

export function EventPlaceSummary({
  event,
  stages,
}: {
  event: EventResponse
  stages: StageResponse[]
}) {
  const { t } = useTranslation('event')
  const FormatIcon = EVENT_FORMAT_ICON[event.effective_format]
  const derived = event.effective_format !== event.format
  const offline = stages.filter((stage) => isOffline(stage.place))

  return (
    <div className="flex flex-col gap-2 text-copy">
      <div className="flex items-center gap-2">
        <Badge tone="outline">
          <FormatIcon className="size-3" aria-hidden="true" />
          {t(EVENT_FORMAT_KEY[event.effective_format])}
        </Badge>
        {derived && (
          <span className="text-muted-foreground text-caption">{t('place.derivedHint')}</span>
        )}
      </div>

      {offline.map((stage) => (
        <p key={stage.id}>
          {t('place.stageLine', {
            name: stage.name,
            place: placeLabel(stage.place, t('place.online')),
            date: formatDate(stage.start_at),
          })}
        </p>
      ))}

      <dl className="flex flex-wrap gap-x-6 gap-y-1 text-muted-foreground">
        {event.track && (
          <div className="flex gap-1">
            <dt>{t('place.track')}:</dt>
            <dd className="text-foreground">{event.track}</dd>
          </div>
        )}
        {event.prize_pool && event.prize_currency && (
          <div className="flex gap-1">
            <dt>{t('place.prizePool')}:</dt>
            <dd className="text-foreground">
              {event.prize_pool} {event.prize_currency}
            </dd>
          </div>
        )}
        {event.team_size_max && (
          <div className="flex gap-1">
            <dt>{t('place.teamSizeMax')}:</dt>
            <dd className="text-foreground">{event.team_size_max}</dd>
          </div>
        )}
      </dl>
    </div>
  )
}
