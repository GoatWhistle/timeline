import type { ParticipantResponse } from '@/shared/api/types.gen'
import { nextId, nowIso, registrationStatuses, registrations } from '../fixtures'

export function attachStatus(participant: ParticipantResponse): ParticipantResponse {
  const status = registrationStatuses.find((item) => item.participant_id === participant.id)
  if (!status) return participant
  return {
    ...participant,
    registration_status: {
      id: status.id,
      status: status.status,
      todo_cycle: status.todo_cycle,
      ...(status.registered_at ? { registered_at: status.registered_at } : {}),
      ...(status.note ? { note: status.note } : {}),
    },
  }
}

export function ensureStatus(participant: ParticipantResponse): void {
  const registration = registrations.find(
    (item) => item.event_id === participant.event_id && item.state === 'ACTIVE',
  )
  if (!registration) return
  if (registrationStatuses.some((item) => item.participant_id === participant.id)) return

  registrationStatuses.push({
    id: nextId(),
    event_id: participant.event_id,
    registration_id: registration.id,
    participant_id: participant.id,
    status: 'TODO',
    todo_cycle: 1,
    last_change_source: 'SYSTEM',
    updated_at: nowIso(),
    user: participant.user,
  })
}
