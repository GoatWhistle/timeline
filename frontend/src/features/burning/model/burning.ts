import {
  isPressing,
  type RegistrationStatus,
  resolveUrgency,
  type Urgency,
  urgencyRank,
} from '@/entities/deadline/urgency/urgency'
import type { MyEventItem } from '@/shared/api/types.gen'

export type BurningReason = 'deadline' | 'starting' | 'running' | 'none'

export type BurningItem = {
  event: MyEventItem
  urgency: Urgency
  reason: BurningReason
  deadlineAt: string | null
  status: RegistrationStatus | null
  actionable: boolean
  sortAt: number
}

const STARTING_WINDOW_DAYS = 7

const DAY_MS = 86_400_000

const CLOSED_STATES = new Set(['FINISHED', 'ARCHIVED'])

function statusOf(event: MyEventItem): RegistrationStatus | null {
  return (event.registration_status?.status as RegistrationStatus | undefined) ?? null
}

function reasonOf(event: MyEventItem, urgency: Urgency, now: Date): BurningReason {
  if (isPressing(urgency)) return 'deadline'
  if (event.state === 'ACTIVE') return 'running'

  const start = new Date(event.start_at).getTime()
  if (!Number.isFinite(start)) return 'none'
  const ahead = start - now.getTime()
  if (ahead >= 0 && ahead <= STARTING_WINDOW_DAYS * DAY_MS) return 'starting'
  return 'none'
}

export function isActionable(event: MyEventItem, status: RegistrationStatus | null): boolean {
  if (status !== 'TODO') return false
  if (CLOSED_STATES.has(event.state)) return false
  return true
}

export function toBurningItem(event: MyEventItem, now: Date = new Date()): BurningItem {
  const deadlineAt = event.registration_deadline ?? null
  const status = statusOf(event)
  const urgency = resolveUrgency({ deadlineAt, status, now })
  const anchor = deadlineAt ?? event.start_at
  const parsed = new Date(anchor).getTime()

  return {
    event,
    urgency,
    reason: reasonOf(event, urgency, now),
    deadlineAt,
    status,
    actionable: isActionable(event, status),
    sortAt: Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY,
  }
}

export function compareByUrgency(a: BurningItem, b: BurningItem): number {
  const byLevel = urgencyRank(a.urgency) - urgencyRank(b.urgency)
  if (byLevel !== 0) return byLevel
  if (a.sortAt !== b.sortAt) return a.sortAt - b.sortAt
  return a.event.id.localeCompare(b.event.id)
}

function compareByStart(a: BurningItem, b: BurningItem): number {
  const aStart = new Date(a.event.start_at).getTime()
  const bStart = new Date(b.event.start_at).getTime()
  if (aStart !== bStart) return aStart - bStart
  return a.event.id.localeCompare(b.event.id)
}

export type BurningSort = 'urgency' | 'start'

const COMPARATORS: Record<BurningSort, (a: BurningItem, b: BurningItem) => number> = {
  urgency: compareByUrgency,
  start: compareByStart,
}

export type BurningFilters = {
  sort: BurningSort
  activeOnly: boolean
  needsAction: boolean
}

export const DEFAULT_FILTERS: BurningFilters = {
  sort: 'urgency',
  activeOnly: true,
  needsAction: false,
}

function isOpenState(event: MyEventItem): boolean {
  return !CLOSED_STATES.has(event.state)
}

export function buildBurning(
  events: readonly MyEventItem[],
  filters: BurningFilters,
  now: Date = new Date(),
): BurningItem[] {
  const items = events.map((event) => toBurningItem(event, now))
  const kept = items.filter((item) => {
    if (filters.activeOnly && !isOpenState(item.event)) return false
    if (filters.needsAction && !item.actionable) return false
    return true
  })
  return kept.sort(COMPARATORS[filters.sort])
}
