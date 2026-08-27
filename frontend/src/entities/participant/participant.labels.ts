import type { ParticipationStatus } from '@/shared/api/types.gen'

export const PARTICIPATION_STATUS_LABEL: Record<ParticipationStatus, string> = {
  ASSIGNED: 'Назначен',
  REMOVED: 'Удалён',
}
