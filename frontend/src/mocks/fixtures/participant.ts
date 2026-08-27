import type { ParticipantResponse } from '@/shared/api/types.gen'
import { at } from './clock'
import { events } from './event'
import { users } from './user'

type ParticipantSeed = {
  id: string
  eventId: string
  userId: string
  teamRole: string
  status?: ParticipantResponse['participation_status']
}

const participantSeeds: ParticipantSeed[] = [
  {
    id: 'c1000000-0000-4000-8000-000000000001',
    eventId: events[0]!.id,
    userId: users[1]!.id,
    teamRole: 'Разработчик',
  },
  {
    id: 'c1000000-0000-4000-8000-000000000002',
    eventId: events[0]!.id,
    userId: users[2]!.id,
    teamRole: 'Аналитик',
  },
  {
    id: 'c1000000-0000-4000-8000-000000000003',
    eventId: events[0]!.id,
    userId: users[3]!.id,
    teamRole: 'Дизайнер',
    status: 'REMOVED',
  },
  {
    id: 'c2000000-0000-4000-8000-000000000001',
    eventId: events[1]!.id,
    userId: users[1]!.id,
    teamRole: 'Капитан команды',
  },
  {
    id: 'c2000000-0000-4000-8000-000000000002',
    eventId: events[1]!.id,
    userId: users[2]!.id,
    teamRole: 'Разработчик',
  },
  {
    id: 'c3000000-0000-4000-8000-000000000001',
    eventId: events[2]!.id,
    userId: users[1]!.id,
    teamRole: 'Разработчик',
  },
]

export const participants: ParticipantResponse[] = participantSeeds.map((seed) => {
  const owner = users.find((item) => item.id === seed.userId)
  if (!owner) throw new Error('Мок: неизвестный пользователь участника')
  const removed = seed.status === 'REMOVED'
  return {
    id: seed.id,
    event_id: seed.eventId,
    team_role: seed.teamRole,
    participation_status: seed.status ?? 'ASSIGNED',
    assignment_version: 1,
    assigned_at: at(-30),
    ...(removed ? { removed_at: at(-7) } : {}),
    user: {
      id: owner.id,
      display_name: owner.display_name,
      email: owner.email,
      is_active: owner.is_active,
    },
  }
})
