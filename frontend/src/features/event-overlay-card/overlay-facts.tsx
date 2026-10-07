import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { EVENT_STATE_KEY } from '@/entities/event/event.labels'
import { EVENT_STATE_TEXT } from '@/entities/event/event-state-mark/event-state-sign'
import { TeamSizeFigures } from '@/entities/event/team-size/team-size-figures'
import { EVENT_FORMAT_ICON, EVENT_FORMAT_KEY, placeLabel } from '@/entities/stage/stage.place'
import type { EventState, EventTrackSummary } from '@/shared/api/types.gen'
import { formatDateTime } from '@/shared/datetime/datetime'
import { formatMoney } from '@/shared/money/money'
import { cn } from '@/shared/styling/class-names/class-names'
import type { OverlayFacts } from './overlay-model'

function Fact({ label, children, name }: { label: string; children: ReactNode; name: string }) {
  return (
    <div data-overlay-fact={name} className="flex min-w-0 flex-col gap-1">
      <dt className="text-caption text-muted-foreground">{label}</dt>
      <dd className="min-w-0 font-medium text-copy">{children}</dd>
    </div>
  )
}

export function OverlayFactList({
  facts,
  state,
  startAt,
  endAt,
}: {
  facts: OverlayFacts
  state: EventState
  startAt: string
  endAt: string
}) {
  const { t } = useTranslation('event')
  const FormatIcon = EVENT_FORMAT_ICON[facts.effectiveFormat]
  const prize = formatMoney(facts.prizePool ?? undefined, facts.prizeCurrency ?? undefined)
  const place = facts.place ? placeLabel(facts.place, t('place.online')) : null
  const hasTeamSize = facts.teamSizeMin !== undefined || facts.teamSizeMax !== undefined

  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
      <Fact name="state" label={t('catalog.column.state')}>
        <span className={EVENT_STATE_TEXT[state]}>
          {t(EVENT_STATE_KEY[state].replace('event:', ''))}
        </span>
      </Fact>
      <div data-overlay-dates="" className="flex min-w-0 flex-col gap-3 sm:row-span-2">
        <Fact name="start" label={t('catalog.sort.start_at')}>
          <span className="tabular-nums">{formatDateTime(startAt)}</span>
        </Fact>
        <Fact name="end" label={t('catalog.sort.end_at')}>
          <span className="tabular-nums">{formatDateTime(endAt)}</span>
        </Fact>
      </div>
      <Fact name="format" label={t('place.effective')}>
        <span className="inline-flex max-w-full items-center gap-1.5">
          <FormatIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="truncate">{t(EVENT_FORMAT_KEY[facts.effectiveFormat])}</span>
        </span>
        {place && (
          <span className={cn('block truncate font-normal text-caption text-muted-foreground')}>
            {place}
          </span>
        )}
      </Fact>
      {prize && (
        <Fact name="prize" label={t('place.prizePoolShort')}>
          <span className="font-semibold text-prize tabular-nums">{prize}</span>
        </Fact>
      )}
      {hasTeamSize && (
        <Fact name="team" label={t('place.teamSize')}>
          <TeamSizeFigures min={facts.teamSizeMin} max={facts.teamSizeMax} />
        </Fact>
      )}
    </dl>
  )
}

function TrackLine({
  track,
  currency,
}: {
  track: EventTrackSummary
  currency: string | undefined
}) {
  const total = formatMoney(track.prize_total, currency)
  return (
    <li className="flex items-baseline justify-between gap-3">
      <span className="min-w-0 truncate">{track.name}</span>
      {total && <span className="shrink-0 text-prize tabular-nums">{total}</span>}
    </li>
  )
}

export function OverlayTracks({ facts }: { facts: OverlayFacts }) {
  const { t } = useTranslation('event')
  const currency = facts.prizeCurrency ?? undefined
  if (facts.tracks.length === 0) return null

  return (
    <section data-overlay-tracks="" className="flex flex-col gap-1">
      <h3 className="text-caption text-muted-foreground">{t('place.tracks')}</h3>
      <ul className="flex flex-col gap-1 font-medium text-copy">
        {facts.tracks.map((track) => (
          <TrackLine key={track.id} track={track} currency={currency} />
        ))}
      </ul>
    </section>
  )
}
