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

  if (!derived && offline.length === 0) return null

  return (
    <div className="flex flex-col gap-2 text-copy">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="outline">
          <FormatIcon className="size-3" aria-hidden="true" />
          {t(EVENT_FORMAT_KEY[event.effective_format])}
        </Badge>
        {derived && (
          <span className="text-caption text-muted-foreground">{t('place.derivedHint')}</span>
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
    </div>
  )
}
