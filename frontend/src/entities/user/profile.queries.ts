import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '@/shared/api/client'
import type { MeResponse, TelegramLinkResponse, UpdateProfileRequest } from '@/shared/api/types.gen'

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
