import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, resetCsrfToken, unwrap } from '@/shared/api/client'
import type {
  AuthResponse,
  LoginRequest,
  MeResponse,
  RegisterRequest,
} from '@/shared/api/types.gen'

export const sessionQueryKey = ['session'] as const

/**
 * Текущая сессия. 401 — законный ответ для гостя, поэтому повторов нет:
 * ошибку разбирают охранники маршрутов.
 */
export const sessionQueryOptions = queryOptions<MeResponse>({
  queryKey: sessionQueryKey,
  queryFn: () => unwrap(api.GET('/me')),
  retry: false,
  staleTime: 60_000,
})

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation<AuthResponse, Error, LoginRequest>({
    mutationFn: (body) => unwrap(api.POST('/auth/login', { body })),
    onSuccess: (data) => {
      queryClient.setQueryData(sessionQueryKey, data.user)
    },
  })
}

export function useRegister() {
  const queryClient = useQueryClient()
  return useMutation<AuthResponse, Error, RegisterRequest>({
    mutationFn: (body) => unwrap(api.POST('/auth/register', { body })),
    onSuccess: (data) => {
      queryClient.setQueryData(sessionQueryKey, data.user)
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation<unknown, Error, void>({
    mutationFn: () => unwrap(api.POST('/auth/logout')),
    onSettled: () => {
      // CSRF-токен привязан к сессии: после выхода он больше не действует.
      resetCsrfToken()
      queryClient.clear()
    },
  })
}

export function useLogoutAll() {
  const queryClient = useQueryClient()
  return useMutation<unknown, Error, void>({
    mutationFn: () => unwrap(api.POST('/auth/logout-all')),
    onSettled: () => {
      resetCsrfToken()
      queryClient.clear()
    },
  })
}

export function useVerifyEmail() {
  return useMutation<unknown, Error, { token: string }>({
    mutationFn: (body) => unwrap(api.POST('/auth/verify-email', { body })),
  })
}

export function useResendVerification() {
  return useMutation<unknown, Error, { email: string }>({
    mutationFn: (body) => unwrap(api.POST('/auth/verify-email/resend', { body })),
  })
}

export function useForgotPassword() {
  return useMutation<unknown, Error, { email: string }>({
    mutationFn: (body) => unwrap(api.POST('/auth/password/forgot', { body })),
  })
}

export function useResetPassword() {
  return useMutation<unknown, Error, { token: string; password: string }>({
    mutationFn: (body) => unwrap(api.POST('/auth/password/reset', { body })),
  })
}

export function useInvitePreview(token: string) {
  return queryOptions({
    queryKey: ['invite', token],
    queryFn: () => unwrap(api.GET('/invites/{token}', { params: { path: { token } } })),
    retry: false,
  })
}

export function useAcceptInvite() {
  const queryClient = useQueryClient()
  return useMutation<
    AuthResponse,
    Error,
    { token: string; display_name: string; password: string }
  >({
    mutationFn: (body) => unwrap(api.POST('/invites/accept', { body })),
    onSuccess: (data) => queryClient.setQueryData(sessionQueryKey, data.user),
  })
}
