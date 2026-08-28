import { AlarmClock, Check, CircleAlert, CircleDot, Clock, Minus } from 'lucide-react'
import type * as React from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/styling/class-names/class-names'
import type { Urgency } from './urgency'
import { URGENCY_TEXT } from './urgency'

const URGENCY_ICON: Record<Urgency, React.ComponentType<{ className?: string }>> = {
  overdue: CircleAlert,
  today: AlarmClock,
  soon: Clock,
  calm: CircleDot,
  done: Check,
  waived: Minus,
}

const URGENCY_SHAPE: Record<Urgency, string> = {
  overdue: 'rounded-[3px] border-2',
  today: 'rounded-full border-2',
  soon: 'rounded-full border',
  calm: 'rounded-full border border-dashed',
  done: 'rounded-[3px] border',
  waived: 'rounded-[3px] border border-dotted',
}

export function UrgencyIcon({ urgency, className }: { urgency: Urgency; className?: string }) {
  const Icon = URGENCY_ICON[urgency]
  return (
    <span aria-hidden="true" data-urgency-icon={urgency} className="flex">
      <Icon className={cn('size-3.5 shrink-0', className)} />
    </span>
  )
}

export function UrgencyMark({
  urgency,
  label,
  className,
}: {
  urgency: Urgency
  label: string
  className?: string
}) {
  const { t } = useTranslation('event')

  return (
    <span
      data-urgency={urgency}
      className={cn(
        'inline-flex items-center gap-1.5 px-1.5 py-0.5 text-caption',
        URGENCY_SHAPE[urgency],
        URGENCY_TEXT[urgency],
        'border-current',
        className,
      )}
    >
      <UrgencyIcon urgency={urgency} />
      <span className="tabular whitespace-nowrap">{label}</span>
      <span className="sr-only">{t(`urgency.${urgency}`)}</span>
    </span>
  )
}
