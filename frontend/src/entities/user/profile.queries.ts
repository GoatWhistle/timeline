import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '@/shared/api/client'
import type {
  CreateProfileLinkRequest,
  MeResponse,
  ProfileLink,
  TelegramLinkResponse,
  UpdateProfileLinkRequest,
  UpdateProfileRequest,
} from '@/shared/api/types.gen'

const sessionQueryKey = ['session'] as const

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation<MeResponse, Error, UpdateProfileRequest>({
    mutationFn: (body) => unwrap(api.PATCH('/me', { body })),
    onSuccess: (data) => queryClient.setQueryData(sessionQueryKey, data),
  })
}

export function useChangeEmail() {
  const queryClient = useQueryClient()
  return useMutation<unknown, Error, { new_email: string; password: string }>({
    mutationFn: (body) => unwrap(api.POST('/me/email-change', { body })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sessionQueryKey }),
  })
}

export function useLinkTelegram() {
  return useMutation<TelegramLinkResponse, Error, void>({
    mutationFn: () => unwrap(api.POST('/me/telegram/link')),
  })
}

export function useUnlinkTelegram() {
  const queryClient = useQueryClient()
  return useMutation<unknown, Error, void>({
    mutationFn: () => unwrap(api.DELETE('/me/telegram')),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sessionQueryKey }),
  })
}

export function useChangePassword() {
  return useMutation<unknown, Error, { current_password: string; new_password: string }>({
    mutationFn: (body) => unwrap(api.POST('/auth/password/change', { body })),
  })
}

export function useLogoutAllSessions() {
  return useMutation<unknown, Error, void>({
    mutationFn: () => unwrap(api.POST('/auth/logout-all')),
  })
}

export function useDeactivateAccount() {
  return useMutation<unknown, Error, void>({
    mutationFn: () => unwrap(api.POST('/me/deactivate')),
  })
}

const profileLinksQueryKey = ['profile-links'] as const

export function useProfileLinks() {
  return useQuery<ProfileLink[]>({
    queryKey: profileLinksQueryKey,
    queryFn: async () => (await unwrap(api.GET('/me/profile-links'))).items ?? [],
  })
}

function useProfileLinksMutation<TVariables>(run: (variables: TVariables) => Promise<unknown>) {
  const queryClient = useQueryClient()
  return useMutation<unknown, Error, TVariables>({
    mutationFn: run,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: profileLinksQueryKey }),
  })
}

export function useCreateProfileLink() {
  return useProfileLinksMutation<CreateProfileLinkRequest>((body) =>
    unwrap(api.POST('/me/profile-links', { body })),
  )
}

export function useUpdateProfileLink() {
  return useProfileLinksMutation<{ id: string; body: UpdateProfileLinkRequest }>(({ id, body }) =>
    unwrap(api.PATCH('/me/profile-links/{id}', { params: { path: { id } }, body })),
  )
}

export function useDeleteProfileLink() {
  return useProfileLinksMutation<string>((id) =>
    unwrap(api.DELETE('/me/profile-links/{id}', { params: { path: { id } } })),
  )
}

export function useReorderProfileLinks() {
  return useProfileLinksMutation<string[]>((ids) =>
    unwrap(api.PUT('/me/profile-links/order', { body: { ids } })),
  )
}
