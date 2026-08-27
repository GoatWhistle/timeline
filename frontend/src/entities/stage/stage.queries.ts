import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '@/shared/api/client'
import type { RequestBody } from '@/shared/api/params'
import type { StageResponse } from '@/shared/api/types.gen'

export type CreateStagePayload = RequestBody<'/admin/events/{id}/stages', 'post'>
export type UpdateStagePayload = RequestBody<'/admin/stages/{id}', 'patch'>

export function stagesQuery(eventId: string) {
  return queryOptions({
    queryKey: ['stages', eventId],
    queryFn: () => unwrap(api.GET('/events/{id}/stages', { params: { path: { id: eventId } } })),
  })
}

export function useCreateStage(eventId: string) {
  const queryClient = useQueryClient()
  return useMutation<StageResponse, Error, CreateStagePayload>({
    mutationFn: (body) =>
      unwrap(
        api.POST('/admin/events/{id}/stages', {
          params: { path: { id: eventId } },
          body,
        }),
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['stages', eventId] }),
  })
}

export function useUpdateStage(eventId: string) {
  const queryClient = useQueryClient()
  return useMutation<StageResponse, Error, { id: string; body: UpdateStagePayload }>({
    mutationFn: ({ id, body }) =>
      unwrap(api.PATCH('/admin/stages/{id}', { params: { path: { id } }, body })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['stages', eventId] }),
  })
}

export function useDeleteStage(eventId: string) {
  const queryClient = useQueryClient()
  return useMutation<unknown, Error, string>({
    mutationFn: (id) => unwrap(api.DELETE('/admin/stages/{id}', { params: { path: { id } } })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['stages', eventId] }),
  })
}
