import { CalendarDays } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { TeamSizeFigures } from '@/entities/event/team-size/team-size-figures'
import { EVENT_FORMAT_ICON, EVENT_FORMAT_KEY, placeLabel } from '@/entities/stage/stage.place'
import type { EventFormat, Place } from '@/shared/api/types.gen'
import { formatDateRange } from '@/shared/datetime/datetime'
import { formatMoney } from '@/shared/money/money'
import { cn } from '@/shared/styling/class-names/class-names'
import { durationDays } from './catalog.facts'

export type FactRowsEvent = {
  startAt: string
  endAt: string
  format: EventFormat
  place: Place | null
  teamSizeMin: number | undefined
  teamSizeMax: number | undefined
  prizePool: string | null | undefined
  prizeCurrency: string | null | undefined
}

function FactRow({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span aria-hidden="true" className="flex w-4 shrink-0 justify-center text-muted-foreground">
        {icon}
      </span>
      <span className="flex min-w-0 items-baseline gap-2">{children}</span>
    </span>
  )
}

export function EventFactRows({ facts, className }: { facts: FactRowsEvent; className?: string }) {
  const { t } = useTranslation('event')
  const FormatIcon = EVENT_FORMAT_ICON[facts.format]
  const prize = formatMoney(facts.prizePool ?? undefined, facts.prizeCurrency ?? undefined)
  const place = facts.place ? placeLabel(facts.place, t('place.online')) : null
  const hasTeam = facts.teamSizeMin !== undefined || facts.teamSizeMax !== undefined

  return (
    <span data-card-facts="" className={cn('flex min-w-0 flex-col gap-1 text-meta', className)}>
      <FactRow icon={<CalendarDays className="size-3.5" />}>
        <span className="truncate font-medium">{formatDateRange(facts.startAt, facts.endAt)}</span>
        <span data-card-duration="" className="shrink-0 text-muted-foreground tabular-nums">
          {t('catalog.column.durationDays', { count: durationDays(facts.startAt, facts.endAt) })}
        </span>
      </FactRow>
      <FactRow icon={<FormatIcon className="size-3.5" />}>
        <span className="shrink-0">{t(EVENT_FORMAT_KEY[facts.format])}</span>
        {place && (
          <span data-card-place="" className="truncate text-muted-foreground">
            {place}
          </span>
        )}
      </FactRow>
      {(hasTeam || prize) && (
        <span data-card-stakes="" className="flex min-h-6 min-w-0 items-center gap-2">
          <TeamSizeFigures min={facts.teamSizeMin} max={facts.teamSizeMax} />
          {prize && (
            <span className="ml-auto shrink-0 font-semibold text-heading text-prize tabular-nums">
              {prize}
            </span>
          )}
        </span>
      )}
    </span>
  )
}
