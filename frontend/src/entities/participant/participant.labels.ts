import type { ParticipationStatus } from '@/shared/api/types.gen'

export const PARTICIPATION_STATUS_KEY: Record<ParticipationStatus, string> = {
  ASSIGNED: 'registration:participation.ASSIGNED',
  REMOVED: 'registration:participation.REMOVED',
}
