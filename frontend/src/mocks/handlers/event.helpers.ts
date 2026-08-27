import type { RegistrationStatusShort, StageShort } from '@/shared/api/types.gen'
import { participants, registrationStatuses, stages } from '../fixtures'

export function stagesOf(eventId: string) {
  return stages
    .filter((item) => item.event_id === eventId)
    .sort((a, b) => a.sort_order - b.sort_order)
}

export function nextStageOf(eventId: string): StageShort | undefined {
  const current = Date.now()
  const upcoming = stagesOf(eventId)
    .filter((item) => Date.parse(item.end_at) >= current)
    .sort((a, b) => Date.parse(a.start_at) - Date.parse(b.start_at))[0]
  if (!upcoming) return undefined
  return {
    id: upcoming.id,
    name: upcoming.name,
    type: upcoming.type,
    start_at: upcoming.start_at,
    end_at: upcoming.end_at,
  }
}

export function statusShortOf(participantId: string): RegistrationStatusShort | undefined {
  const status = registrationStatuses.find((item) => item.participant_id === participantId)
  if (!status) return undefined
  return {
    id: status.id,
    status: status.status,
    todo_cycle: status.todo_cycle,
    ...(status.registered_at ? { registered_at: status.registered_at } : {}),
    ...(status.note ? { note: status.note } : {}),
  }
}

export function assignmentsOf(userId: string) {
  return participants.filter(
    (item) => item.user.id === userId && item.participation_status === 'ASSIGNED',
  )
}
