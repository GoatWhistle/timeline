import { parseISO } from 'date-fns'

export type Urgency = 'calm' | 'soon' | 'today' | 'overdue' | 'done'

export type UrgencyInput = {
  deadlineAt: string | null | undefined
  status?: 'TODO' | 'DONE' | 'NOT_REQUIRED' | null
  now?: Date
}

const DAY_MS = 86_400_000
const SOON_DAYS = 7

export function resolveUrgency({ deadlineAt, status, now = new Date() }: UrgencyInput): Urgency {
  if (status === 'DONE' || status === 'NOT_REQUIRED') return 'done'
  if (!deadlineAt) return 'calm'

  const deadline = parseISO(deadlineAt)
  if (Number.isNaN(deadline.getTime())) return 'calm'

  const remaining = deadline.getTime() - now.getTime()
  if (remaining < 0) return 'overdue'
  if (remaining < DAY_MS) return 'today'
  if (remaining <= SOON_DAYS * DAY_MS) return 'soon'
  return 'calm'
}

export const URGENCY_TEXT: Record<Urgency, string> = {
  calm: 'text-muted-foreground',
  soon: 'text-urgency-soon',
  today: 'font-semibold text-urgency-today',
  overdue: 'font-semibold text-urgency-overdue',
  done: 'text-urgency-done',
}

export const URGENCY_KEY: Record<Urgency, string> = {
  calm: 'event:urgency.calm',
  soon: 'event:urgency.soon',
  today: 'event:urgency.today',
  overdue: 'event:urgency.overdue',
  done: 'event:urgency.done',
}
