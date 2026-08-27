import type { InviteResponse } from '@/shared/api/types.gen'
import { at } from './clock'
import { users } from './user'

export const invites: InviteResponse[] = [
  {
    id: 'f1000000-0000-4000-8000-000000000001',
    email: 'newcomer@example.com',
    created_by_user_id: users[0]!.id,
    expires_at: at(2),
    created_at: at(-1),
  },
  {
    id: 'f1000000-0000-4000-8000-000000000002',
    email: 'accepted@example.com',
    created_by_user_id: users[0]!.id,
    expires_at: at(-5),
    accepted_at: at(-6),
    created_at: at(-8),
  },
]
