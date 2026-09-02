import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '@/shared/api/client'
import type { EventResponse } from '@/shared/api/types.gen'

function useCoverMutation<TVariables>(
  id: string,
  run: (variables: TVariables) => Promise<EventResponse>,
) {
  const queryClient = useQueryClient()
  return useMutation<EventResponse, Error, TVariables>({
    mutationFn: run,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-event', id] })
      queryClient.invalidateQueries({ queryKey: ['admin-events'] })
      queryClient.invalidateQueries({ queryKey: ['event-card', id] })
      queryClient.invalidateQueries({ queryKey: ['catalog'] })
    },
  })
}

export function useUploadCover(id: string) {
  return useCoverMutation<Blob>(id, (file) => {
    const form = new FormData()
    form.append('file', file, 'cover')
    return unwrap(
      api.POST('/admin/events/{id}/cover', {
        params: { path: { id } },
        body: form as unknown as { file: string },
        bodySerializer: (value: unknown) => value as FormData,
      }),
    )
  })
}

export function useRemoveCover(id: string) {
  return useCoverMutation<void>(id, () =>
    unwrap(api.DELETE('/admin/events/{id}/cover', { params: { path: { id } } })),
  )
}

export function useRefreshCover(id: string) {
  return useCoverMutation<void>(id, () =>
    unwrap(api.POST('/admin/events/{id}/cover/refresh', { params: { path: { id } } })),
  )
}
