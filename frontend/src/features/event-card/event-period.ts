import { parseISO } from 'date-fns'

export type PeriodPhase = 'before' | 'during' | 'after' | 'unknown'

export type EventPeriod = {
  phase: PeriodPhase
  progress: number
  days: number
}

const DAY_MS = 86_400_000

export function resolvePeriod(
  startIso: string | null | undefined,
  endIso: string | null | undefined,
  now: Date = new Date(),
): EventPeriod {
  const start = startIso ? parseISO(startIso).getTime() : Number.NaN
  const end = endIso ? parseISO(endIso).getTime() : Number.NaN
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) {
    return { phase: 'unknown', progress: 0, days: 0 }
  }

  const current = now.getTime()
  if (current < start) {
    return { phase: 'before', progress: 0, days: Math.ceil((start - current) / DAY_MS) }
  }
  if (current > end) {
    return { phase: 'after', progress: 1, days: Math.ceil((current - end) / DAY_MS) }
  }

  const span = end - start
  return {
    phase: 'during',
    progress: span > 0 ? (current - start) / span : 1,
    days: Math.ceil((end - current) / DAY_MS),
  }
}

export const PERIOD_KEY: Record<PeriodPhase, string> = {
  before: 'card.periodBefore',
  during: 'card.periodDuring',
  after: 'card.periodAfter',
  unknown: 'card.periodUnknown',
}
