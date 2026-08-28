import type { RegistrationStatusResponse } from '@/shared/api/types.gen'
import { at } from './clock'
import { events } from './event'
import { participants } from './participant'
import { registrations } from './registration'
import { users } from './user'

export const registrationStatuses: RegistrationStatusResponse[] = [
  {
    id: 'd1000000-0000-4000-8000-000000000001',
    event_id: events[0]!.id,
    registration_id: registrations[0]!.id,
    participant_id: participants[0]!.id,
    status: 'TODO',
    todo_cycle: 1,
    last_change_source: 'SYSTEM',
    updated_at: at(-30),
    user: participants[0]!.user,
  },
  {
    id: 'd1000000-0000-4000-8000-000000000002',
    event_id: events[0]!.id,
    registration_id: registrations[0]!.id,
    participant_id: participants[1]!.id,
    status: 'DONE',
    todo_cycle: 1,
    registered_at: at(-4),
    last_change_source: 'USER',
    last_changed_by_user_id: users[2]!.id,
    updated_at: at(-4),
    user: participants[1]!.user,
  },
  {
    id: 'd2000000-0000-4000-8000-000000000001',
    event_id: events[1]!.id,
    registration_id: registrations[1]!.id,
    participant_id: participants[3]!.id,
    status: 'TODO',
    todo_cycle: 2,
    last_change_source: 'ADMIN',
    last_changed_by_user_id: users[0]!.id,
    note: 'Returned by the administrator: the registration was not confirmed.',
    updated_at: at(-2),
    user: participants[3]!.user,
  },
  {
    id: 'd2000000-0000-4000-8000-000000000002',
    event_id: events[1]!.id,
    registration_id: registrations[1]!.id,
    participant_id: participants[4]!.id,
    status: 'NOT_REQUIRED',
    todo_cycle: 1,
    last_change_source: 'ADMIN',
    last_changed_by_user_id: users[0]!.id,
    updated_at: at(-6),
    user: participants[4]!.user,
  },
]
