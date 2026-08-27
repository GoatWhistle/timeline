import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '@/shared/api/client'
import type { CreateInviteResponse } from '@/shared/api/types.gen'

export function invitesQuery(page: number) {
  return queryOptions({
    queryKey: ['invites', page],
    queryFn: () => unwrap(api.GET('/admin/invites', { params: { query: { page } } })),
  })
}

export function useCreateInvite() {
  const queryClient = useQueryClient()
  return useMutation<CreateInviteResponse, Error, { email: string }>({
    mutationFn: (body) => unwrap(api.POST('/admin/invites', { body })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invites'] }),
  })
}

export function useRevokeInvite() {
  const queryClient = useQueryClient()
  return useMutation<unknown, Error, string>({
    mutationFn: (id) =>
      unwrap(api.POST('/admin/invites/{id}/revoke', { params: { path: { id } } })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invites'] }),
  })
}
