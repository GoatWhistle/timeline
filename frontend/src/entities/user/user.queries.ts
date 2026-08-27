import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '@/shared/api/client'

export { type UsersParams, usersQuery } from '@/shared/api/directory'

export function useActivateUser() {
  const queryClient = useQueryClient()
  return useMutation<unknown, Error, string>({
    mutationFn: (id) =>
      unwrap(api.POST('/admin/users/{id}/activate', { params: { path: { id } } })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  })
}

export function useDeactivateUser() {
  const queryClient = useQueryClient()
  return useMutation<unknown, Error, string>({
    mutationFn: (id) =>
      unwrap(api.POST('/admin/users/{id}/deactivate', { params: { path: { id } } })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()
  return useMutation<unknown, Error, string>({
    mutationFn: (id) => unwrap(api.DELETE('/admin/users/{id}', { params: { path: { id } } })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  })
}
