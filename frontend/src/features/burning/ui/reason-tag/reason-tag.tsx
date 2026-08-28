import { CalendarClock, Flame, Play } from 'lucide-react'
import type * as React from 'react'
import { useTranslation } from 'react-i18next'
import type { BurningReason } from '@/features/burning/model/burning'

const REASON_ICON: Record<
  Exclude<BurningReason, 'none'>,
  React.ComponentType<{ className?: string }>
> = {
  deadline: Flame,
  starting: CalendarClock,
  running: Play,
}

export function ReasonTag({ reason }: { reason: BurningReason }) {
  const { t } = useTranslation('event')
  if (reason === 'none') return null

  const Icon = REASON_ICON[reason]

  return (
    <span
      data-reason={reason}
      className="inline-flex shrink-0 items-center gap-1 text-caption text-muted-foreground"
    >
      <Icon className="size-3 shrink-0" aria-hidden="true" />
      {t(`burning.reason.${reason}`)}
      <span aria-hidden="true">·</span>
    </span>
  )
}
