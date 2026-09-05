import { useTranslation } from 'react-i18next'
import { EVENT_FORMAT_ICON, EVENT_FORMAT_KEY } from '@/entities/stage/stage.place'
import { TeamSizeFigures } from '@/features/event-card/team-size-figures'
import type { EventTrackSummary } from '@/shared/api/types.gen'
import { formatMoney } from '@/shared/money/money'
import type { OverlayFacts } from './overlay-model'

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="text-caption text-muted-foreground">{label}</dt>
      <dd className="min-w-0 font-medium text-copy">{children}</dd>
    </div>
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

export function OverlayFactList({ facts }: { facts: OverlayFacts }) {
  const { t } = useTranslation('event')
  const FormatIcon = EVENT_FORMAT_ICON[facts.effectiveFormat]
  const currency = facts.prizeCurrency ?? undefined
  const prize = formatMoney(facts.prizePool ?? undefined, currency)
  const hasTeamSize = facts.teamSizeMin !== undefined || facts.teamSizeMax !== undefined

  return (
    <div className="flex flex-col gap-4">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
        <Fact label={t('place.effective')}>
          <span className="inline-flex items-center gap-1.5">
            <FormatIcon className="size-4 text-muted-foreground" aria-hidden="true" />
            {t(EVENT_FORMAT_KEY[facts.effectiveFormat])}
          </span>
        </Fact>

        {prize && (
          <Fact label={t('place.prizePoolShort')}>
            <span className="font-semibold text-prize tabular-nums">{prize}</span>
          </Fact>
        )}

        {hasTeamSize && (
          <Fact label={t('place.teamSize')}>
            <TeamSizeFigures min={facts.teamSizeMin} max={facts.teamSizeMax} />
          </Fact>
        )}
      </dl>

      {facts.tracks.length > 0 && (
        <section className="flex flex-col gap-1">
          <h3 className="text-caption text-muted-foreground">{t('place.tracks')}</h3>
          <ul className="flex flex-col gap-1 font-medium text-copy">
            {facts.tracks.map((track) => (
              <TrackLine key={track.id} track={track} currency={currency} />
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
