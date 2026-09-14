import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, resetCsrfToken, unwrap } from '@/shared/api/client'
import type { AuthResponse, LoginRequest, RegisterRequest } from '@/shared/api/types.gen'

const sessionQueryKey = ['session'] as const

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
      resetCsrfToken()
      queryClient.clear()
    },
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
