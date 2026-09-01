import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '@/shared/api/client'
import type { MeResponse } from '@/shared/api/types.gen'

const sessionQueryKey = ['session'] as const

export function useUploadAvatar() {
  const queryClient = useQueryClient()
  return useMutation<MeResponse, Error, Blob>({
    mutationFn: (file) => {
      const form = new FormData()
      form.append('file', file, 'avatar')
      return unwrap(
        api.POST('/me/avatar', {
          body: form as unknown as { file: string },
          bodySerializer: (value: unknown) => value as FormData,
        }),
      )
    },
    onSuccess: (data) => queryClient.setQueryData(sessionQueryKey, data),
  })
}

export function useRemoveAvatar() {
  const queryClient = useQueryClient()
  return useMutation<MeResponse, Error, void>({
    mutationFn: () => unwrap(api.DELETE('/me/avatar')),
    onSuccess: (data) => queryClient.setQueryData(sessionQueryKey, data),
  })
}
