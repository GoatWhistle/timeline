import { i18n } from '@/shared/i18n/config'
import type { Urgency } from './urgency'
import { DAY_MS, overdueDays, remainingDays } from './urgency'

export type CountdownParts = {
  kind: 'overdue' | 'hours' | 'days' | 'none'
  count: number
}

export function countdownParts(
  urgency: Urgency,
  deadlineAt: string | null | undefined,
  now: Date = new Date(),
): CountdownParts {
  if (!deadlineAt || urgency === 'done' || urgency === 'waived') return { kind: 'none', count: 0 }

  if (urgency === 'overdue') return { kind: 'overdue', count: overdueDays(deadlineAt, now) }

  const remaining = new Date(deadlineAt).getTime() - now.getTime()
  if (remaining < DAY_MS) {
    return { kind: 'hours', count: Math.max(1, Math.ceil(remaining / 3_600_000)) }
  }
  return { kind: 'days', count: Math.max(1, remainingDays(deadlineAt, now)) }
}

const KIND_KEY: Record<CountdownParts['kind'], string> = {
  overdue: 'urgency.overdueBy',
  hours: 'urgency.leftHours',
  days: 'urgency.leftDays',
  none: '',
}

export function countdownLabel(
  urgency: Urgency,
  deadlineAt: string | null | undefined,
  now: Date = new Date(),
): string {
  const t = i18n.getFixedT(null, 'event')
  const parts = countdownParts(urgency, deadlineAt, now)
  if (parts.kind === 'none') return t(`urgency.${urgency}`)
  return t(KIND_KEY[parts.kind], { count: parts.count })
}
