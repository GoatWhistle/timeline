import type { EventState, MyEventItem, RegistrationStatusValue } from '@/shared/api/types.gen'

export const NOW = new Date('2026-03-10T12:00:00Z')

const HOUR = 3_600_000
const DAY = 86_400_000

function iso(offsetMs: number): string {
  return new Date(NOW.getTime() + offsetMs).toISOString()
}

export type EventOptions = {
  id: string
  title?: string
  state?: EventState
  status?: RegistrationStatusValue | null
  deadlineHours?: number | null
  startDays?: number
  registrationUrl?: string | null
}

export function event({
  id,
  title = `Event ${id}`,
  state = 'UPCOMING',
  status = 'TODO',
  deadlineHours = 48,
  startDays = 10,
  registrationUrl = 'https://example.com/register',
}: EventOptions): MyEventItem {
  return {
    id,
    title,
    state,
    team_role: 'Developer',
    organizer: 'Organizer',
    start_at: iso(startDays * DAY),
    end_at: iso((startDays + 2) * DAY),
    registration_url: registrationUrl ?? undefined,
    registration_deadline: deadlineHours === null ? undefined : iso(deadlineHours * HOUR),
    registration_status:
      status === null ? undefined : { id: `${id}-status`, status, todo_cycle: 1 },
  }
}

export function events(): MyEventItem[] {
  return [
    event({ id: 'calm', deadlineHours: 24 * 20, startDays: 30 }),
    event({ id: 'waived', status: 'NOT_REQUIRED', deadlineHours: -24, startDays: 4 }),
    event({ id: 'overdue', deadlineHours: -12, state: 'ACTIVE', startDays: -2 }),
    event({ id: 'done', status: 'DONE', deadlineHours: 24 * 3, startDays: 12 }),
    event({ id: 'soon', deadlineHours: 24 * 4, startDays: 14 }),
    event({ id: 'today', deadlineHours: 6, startDays: 6 }),
    event({ id: 'finished', state: 'FINISHED', deadlineHours: -24 * 40, startDays: -50 }),
    event({ id: 'archived', state: 'ARCHIVED', deadlineHours: -24 * 90, startDays: -100 }),
  ]
}
