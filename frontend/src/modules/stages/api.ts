import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '@/shared/api/client'
import type { RequestBody } from '@/shared/api/params'
import type { StageResponse } from '@/shared/api/types.gen'

export type CreateStagePayload = RequestBody<'/admin/hackathons/{id}/stages', 'post'>
export type UpdateStagePayload = RequestBody<'/admin/stages/{id}', 'patch'>

export function stagesQuery(hackathonId: string) {
  return queryOptions({
    queryKey: ['stages', hackathonId],
    queryFn: () =>
      unwrap(api.GET('/hackathons/{id}/stages', { params: { path: { id: hackathonId } } })),
  })
}

export function useCreateStage(hackathonId: string) {
  const queryClient = useQueryClient()
  return useMutation<StageResponse, Error, CreateStagePayload>({
    mutationFn: (body) =>
      unwrap(
        api.POST('/admin/hackathons/{id}/stages', {
          params: { path: { id: hackathonId } },
          body,
        }),
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['stages', hackathonId] }),
  })
}

export function useUpdateStage(hackathonId: string) {
  const queryClient = useQueryClient()
  return useMutation<StageResponse, Error, { id: string; body: UpdateStagePayload }>({
    mutationFn: ({ id, body }) =>
      unwrap(api.PATCH('/admin/stages/{id}', { params: { path: { id } }, body })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['stages', hackathonId] }),
  })
}

export function useDeleteStage(hackathonId: string) {
  const queryClient = useQueryClient()
  return useMutation<unknown, Error, string>({
    mutationFn: (id) => unwrap(api.DELETE('/admin/stages/{id}', { params: { path: { id } } })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['stages', hackathonId] }),
  })
}
