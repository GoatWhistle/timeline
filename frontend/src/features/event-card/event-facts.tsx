import { Globe } from 'lucide-react'
import type * as React from 'react'
import { useTranslation } from 'react-i18next'
import { TeamSizeFigures } from '@/entities/event/team-size/team-size-figures'
import { EVENT_FORMAT_ICON, EVENT_FORMAT_KEY } from '@/entities/stage/stage.place'
import type { EventResponse } from '@/shared/api/types.gen'
import { formatMoney } from '@/shared/money/money'
import { ExternalLink } from '@/shared/ui/navigation/external-link/external-link'
import { linkHost } from '@/shared/ui/navigation/external-link/external-url'
import { EventPeriodFact } from './event-period-fact'

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-border border-b py-3 first:pt-0 last:border-b-0 last:pb-0">
      <dt className="text-caption text-muted-foreground">{label}</dt>
      <dd className="min-w-0 font-medium text-copy">{children}</dd>
    </div>
  )
}

export function EventFacts({ event }: { event: EventResponse }) {
  const { t } = useTranslation('event')
  const FormatIcon = EVENT_FORMAT_ICON[event.effective_format]
  const prize = formatMoney(event.prize_pool, event.prize_currency)
  const host = event.website_url ? linkHost(event.website_url) : null

  return (
    <dl className="flex flex-col">
      <Fact label={t('place.period')}>
        <EventPeriodFact startAt={event.start_at} endAt={event.end_at} />
      </Fact>

      {event.organizer && <Fact label={t('place.organizer')}>{event.organizer}</Fact>}

      <Fact label={t('place.effective')}>
        <span className="inline-flex items-center gap-1.5">
          <FormatIcon className="size-4 text-muted-foreground" aria-hidden="true" />
          {t(EVENT_FORMAT_KEY[event.effective_format])}
        </span>
      </Fact>

      {prize && (
        <Fact label={t('place.prizePoolShort')}>
          <span className="font-semibold text-heading text-prize tabular-nums">{prize}</span>
        </Fact>
      )}

      {(event.team_size_min !== undefined || event.team_size_max !== undefined) && (
        <Fact label={t('place.teamSize')}>
          <TeamSizeFigures min={event.team_size_min} max={event.team_size_max} />
        </Fact>
      )}

      {event.tracks.length > 0 && (
        <Fact label={t('place.tracks')}>
          {t('card.trackCount', { count: event.tracks.length })}
        </Fact>
      )}

      {event.website_url && host && (
        <Fact label={t('place.website')}>
          <ExternalLink
            href={event.website_url}
            className="max-w-full rounded-control text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Globe className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="truncate">{host}</span>
          </ExternalLink>
        </Fact>
      )}
    </dl>
  )
}
