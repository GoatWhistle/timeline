import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '@/shared/api/client'
import type { QueryParams, RequestBody } from '@/shared/api/params'
import type { BatchResult, ParticipantResponse } from '@/shared/api/types.gen'

export type ParticipantsParams = QueryParams<'/admin/events/{id}/participants', 'get'>
type AddBody = RequestBody<'/admin/events/{id}/participants/batch-add', 'post'>
type RemoveBody = RequestBody<'/admin/events/{id}/participants/batch-remove', 'post'>
type CopyBody = RequestBody<'/admin/events/{id}/participants/copy-from', 'post'>

export function participantsQuery(eventId: string, params: ParticipantsParams) {
  return queryOptions({
    queryKey: ['participants', eventId, params],
    queryFn: () =>
      unwrap(
        api.GET('/admin/events/{id}/participants', {
          params: { path: { id: eventId }, query: params },
        }),
      ),
  })
}

function useInvalidate(eventId: string) {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: ['participants', eventId] })
    queryClient.invalidateQueries({ queryKey: ['registration-statuses', eventId] })
  }
}

export function useAddParticipants(eventId: string) {
  const invalidate = useInvalidate(eventId)
  return useMutation<BatchResult, Error, AddBody>({
    mutationFn: (body) =>
      unwrap(
        api.POST('/admin/events/{id}/participants/batch-add', {
          params: { path: { id: eventId } },
          body,
        }),
      ),
    onSuccess: invalidate,
  })
}

export function useRemoveParticipants(eventId: string) {
  const invalidate = useInvalidate(eventId)
  return useMutation<BatchResult, Error, RemoveBody>({
    mutationFn: (body) =>
      unwrap(
        api.POST('/admin/events/{id}/participants/batch-remove', {
          params: { path: { id: eventId } },
          body,
        }),
      ),
    onSuccess: invalidate,
  })
}

export function useCopyParticipants(eventId: string) {
  const invalidate = useInvalidate(eventId)
  return useMutation<BatchResult, Error, CopyBody>({
    mutationFn: (body) =>
      unwrap(
        api.POST('/admin/events/{id}/participants/copy-from', {
          params: { path: { id: eventId } },
          body,
        }),
      ),
    onSuccess: invalidate,
  })
}

export function useUpdateTeamRole(eventId: string) {
  const invalidate = useInvalidate(eventId)
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

export function useReactivateParticipant(eventId: string) {
  const invalidate = useInvalidate(eventId)
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
