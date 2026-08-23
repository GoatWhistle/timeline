import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '@/shared/api/client'
import type { QueryParams, RequestBody } from '@/shared/api/params'
import type { BatchResult, ParticipantResponse } from '@/shared/api/types.gen'

export type ParticipantsParams = QueryParams<'/admin/hackathons/{id}/participants', 'get'>
type AddBody = RequestBody<'/admin/hackathons/{id}/participants/batch-add', 'post'>
type RemoveBody = RequestBody<'/admin/hackathons/{id}/participants/batch-remove', 'post'>
type CopyBody = RequestBody<'/admin/hackathons/{id}/participants/copy-from', 'post'>

export function participantsQuery(hackathonId: string, params: ParticipantsParams) {
  return queryOptions({
    queryKey: ['participants', hackathonId, params],
    queryFn: () =>
      unwrap(
        api.GET('/admin/hackathons/{id}/participants', {
          params: { path: { id: hackathonId }, query: params },
        }),
      ),
  })
}

function useInvalidate(hackathonId: string) {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: ['participants', hackathonId] })
    queryClient.invalidateQueries({ queryKey: ['registration-statuses', hackathonId] })
  }
}

export function useAddParticipants(hackathonId: string) {
  const invalidate = useInvalidate(hackathonId)
  return useMutation<BatchResult, Error, AddBody>({
    mutationFn: (body) =>
      unwrap(
        api.POST('/admin/hackathons/{id}/participants/batch-add', {
          params: { path: { id: hackathonId } },
          body,
        }),
      ),
    onSuccess: invalidate,
  })
}

export function useRemoveParticipants(hackathonId: string) {
  const invalidate = useInvalidate(hackathonId)
  return useMutation<BatchResult, Error, RemoveBody>({
    mutationFn: (body) =>
      unwrap(
        api.POST('/admin/hackathons/{id}/participants/batch-remove', {
          params: { path: { id: hackathonId } },
          body,
        }),
      ),
    onSuccess: invalidate,
  })
}

export function useCopyParticipants(hackathonId: string) {
  const invalidate = useInvalidate(hackathonId)
  return useMutation<BatchResult, Error, CopyBody>({
    mutationFn: (body) =>
      unwrap(
        api.POST('/admin/hackathons/{id}/participants/copy-from', {
          params: { path: { id: hackathonId } },
          body,
        }),
      ),
    onSuccess: invalidate,
  })
}

export function useUpdateTeamRole(hackathonId: string) {
  const invalidate = useInvalidate(hackathonId)
  return useMutation<ParticipantResponse, Error, { id: string; team_role: string }>({
    mutationFn: ({ id, team_role }) =>
      unwrap(
        api.PATCH('/admin/participants/{id}/team-role', {
          params: { path: { id } },
          body: { team_role },
        }),
      ),
    onSuccess: invalidate,
  })
}

export function useReactivateParticipant(hackathonId: string) {
  const invalidate = useInvalidate(hackathonId)
  return useMutation<ParticipantResponse, Error, { id: string; team_role: string }>({
    mutationFn: ({ id, team_role }) =>
      unwrap(
        api.POST('/admin/participants/{id}/reactivate', {
          params: { path: { id } },
          body: { team_role },
        }),
      ),
    onSuccess: invalidate,
  })
}
