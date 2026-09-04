import { useTranslation } from 'react-i18next'
import { EVENT_FORMAT_ICON, EVENT_FORMAT_KEY } from '@/entities/stage/stage.place'
import { TeamSizeFigures } from '@/features/event-card/team-size-figures'
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

export function OverlayFactList({ facts }: { facts: OverlayFacts }) {
  const { t } = useTranslation('event')
  const FormatIcon = EVENT_FORMAT_ICON[facts.effectiveFormat]
  const prize = formatMoney(facts.prizePool ?? undefined, facts.prizeCurrency ?? undefined)
  const hasTeamSize = facts.teamSizeMin !== undefined || facts.teamSizeMax !== undefined

  return (
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

      {facts.tracks.length > 0 && (
        <Fact label={t('place.tracks')}>
          <ul className="flex flex-col gap-0.5">
            {facts.tracks.map((track) => (
              <li key={track.id} className="min-w-0 truncate">
                {track.name}
              </li>
            ))}
          </ul>
        </Fact>
      )}
    </dl>
  )
}
