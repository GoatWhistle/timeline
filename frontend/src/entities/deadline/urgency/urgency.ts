import { parseISO } from 'date-fns'

export type Urgency = 'overdue' | 'today' | 'soon' | 'calm' | 'done' | 'waived'

export type RegistrationStatus = 'TODO' | 'DONE' | 'NOT_REQUIRED'

export type UrgencyInput = {
  deadlineAt: string | null | undefined
  status?: RegistrationStatus | null
  now?: Date
}

export const DAY_MS = 86_400_000
export const SOON_DAYS = 7

export function resolveUrgency({ deadlineAt, status, now = new Date() }: UrgencyInput): Urgency {
  if (status === 'NOT_REQUIRED') return 'waived'
  if (status === 'DONE') return 'done'
  if (!deadlineAt) return 'calm'

  const deadline = parseISO(deadlineAt)
  if (Number.isNaN(deadline.getTime())) return 'calm'

  const remaining = deadline.getTime() - now.getTime()
  if (remaining < 0) return 'overdue'
  if (remaining < DAY_MS) return 'today'
  if (remaining <= SOON_DAYS * DAY_MS) return 'soon'
  return 'calm'
}

export const URGENCY_ORDER: Urgency[] = ['overdue', 'today', 'soon', 'calm', 'done', 'waived']

const RANK: Record<Urgency, number> = {
  overdue: 0,
  today: 1,
  soon: 2,
  calm: 3,
  done: 4,
  waived: 5,
}

export function urgencyRank(urgency: Urgency): number {
  return RANK[urgency]
}

export const PRESSING: Urgency[] = ['overdue', 'today', 'soon']

export function isPressing(urgency: Urgency): boolean {
  return PRESSING.includes(urgency)
}

export const URGENCY_TEXT: Record<Urgency, string> = {
  overdue: 'font-semibold text-urgency-overdue',
  today: 'font-semibold text-urgency-today',
  soon: 'text-urgency-soon',
  calm: 'text-muted-foreground',
  done: 'text-urgency-done',
  waived: 'text-urgency-waived',
}

export const URGENCY_KEY: Record<Urgency, string> = {
  overdue: 'event:urgency.overdue',
  today: 'event:urgency.today',
  soon: 'event:urgency.soon',
  calm: 'event:urgency.calm',
  done: 'event:urgency.done',
  waived: 'event:urgency.waived',
}

export function remainingDays(deadlineAt: string, now: Date = new Date()): number {
  const deadline = parseISO(deadlineAt)
  if (Number.isNaN(deadline.getTime())) return 0
  return Math.ceil((deadline.getTime() - now.getTime()) / DAY_MS)
}

export function overdueDays(deadlineAt: string, now: Date = new Date()): number {
  const deadline = parseISO(deadlineAt)
  if (Number.isNaN(deadline.getTime())) return 0
  return Math.max(1, Math.floor((now.getTime() - deadline.getTime()) / DAY_MS))
}
