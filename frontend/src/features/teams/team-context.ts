import { useOutletContext } from 'react-router'
import type { TeamDetailResponse } from '@/shared/api/types.gen'

export type TeamContext = {
  teamId: string
  detail: TeamDetailResponse
  isLead: boolean
}

export function useTeamContext(): TeamContext {
  return useOutletContext<TeamContext>()
}
