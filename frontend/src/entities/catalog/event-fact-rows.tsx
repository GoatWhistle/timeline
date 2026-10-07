import { CalendarDays, Timer } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { TeamSizeFigures } from '@/entities/event/team-size/team-size-figures'
import { EVENT_FORMAT_ICON, EVENT_FORMAT_KEY, placeLabel } from '@/entities/stage/stage.place'
import type { EventFormat, Place } from '@/shared/api/types.gen'
import { formatDateRange } from '@/shared/datetime/datetime'
import { formatMoney } from '@/shared/money/money'
import { cn } from '@/shared/styling/class-names/class-names'
import { CARD_FIELDS, type CardField } from './card-fields'
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

function FactRow({
  icon,
  children,
  className,
}: {
  icon: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <span className={cn('flex min-w-0 items-center gap-2', className)}>
      <span aria-hidden="true" className="flex w-4 shrink-0 justify-center text-muted-foreground">
        {icon}
      </span>
      <span className="flex min-w-0 items-baseline gap-2">{children}</span>
    </span>
  )
}

export function EventFactRows({
  facts,
  fields = CARD_FIELDS,
  className,
}: {
  facts: FactRowsEvent
  fields?: readonly CardField[]
  className?: string
}) {
  const { t } = useTranslation('event')
  const FormatIcon = EVENT_FORMAT_ICON[facts.format]
  const prize = formatMoney(facts.prizePool ?? undefined, facts.prizeCurrency ?? undefined)
  const place = facts.place ? placeLabel(facts.place, t('place.online')) : null
  const shows = (field: CardField) => fields.includes(field)
  const hasTeam =
    shows('team') && (facts.teamSizeMin !== undefined || facts.teamSizeMax !== undefined)
  const shownPrize = shows('prize') ? prize : null

  return (
    <span
      data-card-facts=""
      className={cn(
        'grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 text-meta',
        className,
      )}
    >
      {shows('dates') && (
        <FactRow icon={<CalendarDays className="size-3.5" />} className="col-span-2">
          <span data-card-dates="" className="truncate text-foreground">
            {formatDateRange(facts.startAt, facts.endAt)}
          </span>
        </FactRow>
      )}
      {shows('format') && (
        <FactRow icon={<FormatIcon className="size-3.5" />} className="col-start-1">
          <span data-card-format="" className="shrink-0 text-muted-foreground">
            {t(EVENT_FORMAT_KEY[facts.format])}
          </span>
          {place && (
            <span data-card-place="" className="truncate text-muted-foreground">
              {place}
            </span>
          )}
        </FactRow>
      )}
      {shows('duration') && (
        <span
          data-card-duration=""
          className="col-start-2 inline-flex items-center gap-1.5 justify-self-end text-muted-foreground tabular-nums"
        >
          <Timer className="size-3.5 shrink-0" aria-hidden="true" />
          {t('catalog.column.durationDays', { count: durationDays(facts.startAt, facts.endAt) })}
        </span>
      )}
      {hasTeam && (
        <span data-card-team="" className="col-start-1 flex min-h-5 items-center [&_svg]:size-3.5">
          <TeamSizeFigures min={facts.teamSizeMin} max={facts.teamSizeMax} />
        </span>
      )}
      {shownPrize && (
        <span
          data-card-stakes=""
          className="col-start-2 justify-self-end font-semibold text-copy text-prize tabular-nums"
        >
          {shownPrize}
        </span>
      )}
    </span>
  )
}
