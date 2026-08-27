import type { RegistrationResponse } from '@/shared/api/types.gen'
import { at } from './clock'
import { events } from './event'

export const registrations: RegistrationResponse[] = [
  {
    id: 'b1000000-0000-4000-8000-000000000001',
    event_id: events[0]!.id,
    url: 'https://example.com/ai-hack/register',
    deadline_at: at(9),
    description: 'Регистрация на сайте организатора, нужен корпоративный email.',
    state: 'ACTIVE',
    schedule_version: 1,
    activation_version: 1,
    notification_content_version: 1,
    created_at: at(-50),
    updated_at: at(-5),
  },
  {
    id: 'b2000000-0000-4000-8000-000000000002',
    event_id: events[1]!.id,
    url: 'https://example.com/fintech/register',
    deadline_at: at(-1),
    state: 'ACTIVE',
    schedule_version: 2,
    activation_version: 1,
    notification_content_version: 1,
    created_at: at(-40),
    updated_at: at(-3),
  },
]
