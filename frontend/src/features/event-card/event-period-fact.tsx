import { useTranslation } from 'react-i18next'
import { formatEventDay } from '@/shared/datetime/datetime'
import { cn } from '@/shared/styling/class-names/class-names'
import { PERIOD_KEY, resolvePeriod } from './event-period'

const TRACK_TONE: Record<string, string> = {
  before: 'text-muted-foreground',
  during: 'font-semibold text-state-active',
  after: 'text-muted-foreground',
  unknown: 'text-muted-foreground',
}

export function EventPeriodFact({
  startAt,
  endAt,
  now,
}: {
  startAt: string
  endAt: string
  now?: Date
}) {
  const { t } = useTranslation('event')
  const period = resolvePeriod(startAt, endAt, now)
  const percent = Math.round(period.progress * 100)

  return (
    <div className="flex flex-col gap-2" data-event-period={period.phase}>
      <div className="flex items-baseline justify-between gap-3 tabular-nums">
        <span className="truncate">{formatEventDay(startAt)}</span>
        <span className="truncate text-muted-foreground">{formatEventDay(endAt)}</span>
      </div>

      <div
        className="h-1 w-full overflow-hidden rounded-pill bg-border"
        data-event-period-track={percent}
        role="presentation"
      >
        <div
          className={cn(
            'h-full rounded-pill',
            period.phase === 'during' ? 'bg-state-active' : 'bg-state-finished',
            'motion-safe:transition-[width] motion-safe:duration-slow motion-safe:ease-out',
          )}
          style={{ width: `${percent}%` }}
        />
      </div>

      <p className={cn('text-caption', TRACK_TONE[period.phase])}>
        {period.phase === 'unknown'
          ? t(PERIOD_KEY.unknown)
          : t(PERIOD_KEY[period.phase], { count: period.days })}
      </p>
    </div>
  )
}
