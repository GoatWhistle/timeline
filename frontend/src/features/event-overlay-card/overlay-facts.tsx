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
import { NoValue } from '@/shared/ui/data-display/no-value/no-value'
import type { OverlayFacts } from './overlay-model'

function Fact({
  label,
  children,
  name,
  className,
}: {
  label: string
  children: ReactNode
  name: string
  className?: string
}) {
  return (
    <div data-overlay-fact={name} className={cn('flex min-w-0 flex-col gap-1', className)}>
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
      <Fact
        name="state"
        label={t('catalog.column.state')}
        className="sm:col-start-1 sm:row-start-1"
      >
        <span className={EVENT_STATE_TEXT[state]}>
          {t(EVENT_STATE_KEY[state].replace('event:', ''))}
        </span>
      </Fact>
      {prize && (
        <Fact
          name="prize"
          label={t('place.prizePoolShort')}
          className="sm:col-start-1 sm:row-start-2"
        >
          <span className="font-semibold text-prize tabular-nums">{prize}</span>
        </Fact>
      )}
      <div
        data-overlay-dates=""
        className="flex min-w-0 flex-col gap-3 sm:col-start-2 sm:row-span-2 sm:row-start-1"
      >
        <Fact name="start" label={t('catalog.sort.start_at')}>
          <span className="tabular-nums">{formatDateTime(startAt)}</span>
        </Fact>
        <Fact name="end" label={t('catalog.sort.end_at')}>
          <span className="tabular-nums">{formatDateTime(endAt)}</span>
        </Fact>
      </div>
      <div
        data-overlay-trailing=""
        className="flex min-w-0 flex-col gap-3 sm:col-start-3 sm:row-span-2 sm:row-start-1 sm:justify-self-end"
      >
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
        {hasTeamSize && (
          <Fact name="team" label={t('place.teamSize')}>
            <TeamSizeFigures min={facts.teamSizeMin} max={facts.teamSizeMax} />
          </Fact>
        )}
      </div>
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
  const total = Number(track.prize_total) > 0 ? formatMoney(track.prize_total, currency) : null
  return (
    <li
      data-overlay-track=""
      className="flex h-row min-w-0 items-center gap-3 border-border/60 border-b px-3 last:border-b-0"
    >
      <span className="w-5 shrink-0 text-caption text-muted-foreground tabular-nums">
        {String(track.track_no).padStart(2, '0')}
      </span>
      <span className="min-w-0 flex-1 truncate font-medium text-copy">{track.name}</span>
      <span className="shrink-0 text-meta tabular-nums">
        {total ? <span className="font-semibold text-prize">{total}</span> : <NoValue />}
      </span>
    </li>
  )
}

export function OverlayTracks({ facts }: { facts: OverlayFacts }) {
  const { t } = useTranslation('event')
  const currency = facts.prizeCurrency ?? undefined
  if (facts.tracks.length === 0) return null

  return (
    <section data-overlay-tracks="" className="flex flex-col gap-2">
      <h3 className="flex items-baseline gap-2 text-caption text-muted-foreground">
        {t('place.tracks')}
        <span data-overlay-track-count="" className="tabular-nums">
          {facts.tracks.length}
        </span>
      </h3>
      <ul className="overflow-hidden rounded-control border border-border bg-surface-1">
        {facts.tracks.map((track) => (
          <TrackLine key={track.id} track={track} currency={currency} />
        ))}
      </ul>
    </section>
  )
}
