import type { AuditResponse } from '@/shared/api/types.gen'
import { at } from './clock'
import { events } from './event'
import { participants } from './participant'
import { registrationStatuses } from './registration-status'
import { users } from './user'

export const auditLog: AuditResponse[] = [
  {
    id: 'aa000000-0000-4000-8000-000000000001',
    actor_user_id: users[0]!.id,
    actor_email: users[0]!.email,
    action: 'EVENT_PUBLISH',
    entity_type: 'EVENT',
    entity_id: events[0]!.id,
    before: { published_at: null },
    after: { published_at: at(-50) },
    request_id: 'req-0001',
    created_at: at(-50),
  },
  {
    id: 'aa000000-0000-4000-8000-000000000002',
    actor_user_id: users[0]!.id,
    actor_email: users[0]!.email,
    action: 'PARTICIPANT_ADD',
    entity_type: 'EVENT_PARTICIPANT',
    entity_id: participants[0]!.id,
    after: { team_role: 'Developer', participation_status: 'ASSIGNED' },
    request_id: 'req-0002',
    created_at: at(-30),
  },
  {
    id: 'aa000000-0000-4000-8000-000000000003',
    action: 'STATUS_CHANGE',
    entity_type: 'REGISTRATION_STATUS',
    entity_id: registrationStatuses[1]!.id,
    before: { status: 'TODO' },
    after: { status: 'DONE' },
    request_id: 'req-0003',
    created_at: at(-4),
  },
]
