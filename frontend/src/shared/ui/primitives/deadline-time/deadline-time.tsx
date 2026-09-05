import { useTranslation } from 'react-i18next'
import {
  currentTimeZone,
  formatDateTime,
  formatInZone,
  SYSTEM_TIME_ZONE,
  zoneAbbreviation,
  zonesAgree,
} from '@/shared/datetime/datetime'
import { cn } from '@/shared/styling/class-names/class-names'
import { NoValue } from '@/shared/ui/data-display/no-value/no-value'

export function DeadlineTime({
  iso,
  className,
}: {
  iso: string | null | undefined
  className?: string
}) {
  const { t } = useTranslation()
  if (!iso) return <NoValue className={className} />

  const local = formatDateTime(iso)
  const abbreviation = zoneAbbreviation(iso)
  const agree = zonesAgree(iso)

  return (
    <span className={cn('inline-flex flex-col', className)}>
      <span>
        {local}
        {abbreviation ? <span className="ml-1 text-muted-foreground">{abbreviation}</span> : null}
      </span>
      {agree ? null : (
        <span className="text-meta text-muted-foreground">
          {t('timezone.systemNote', { time: formatInZone(iso, SYSTEM_TIME_ZONE) })}
        </span>
      )}
      <span className="sr-only">{currentTimeZone()}</span>
    </span>
  )
}
