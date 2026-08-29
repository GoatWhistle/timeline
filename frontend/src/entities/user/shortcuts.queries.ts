import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '@/shared/api/client'
import { sessionQueryKey, useSession } from '@/shared/api/session'
import type { MeResponse, ShortcutsResponse } from '@/shared/api/types.gen'
import type { ShortcutBindings } from '@/shared/keyboard/shortcut-bindings'

const EMPTY: ShortcutBindings = {}

export function useShortcutBindings(): ShortcutBindings {
  const { user } = useSession()
  return user?.shortcuts ?? EMPTY
}

function patchSession(queryClient: ReturnType<typeof useQueryClient>, data: ShortcutsResponse) {
  queryClient.setQueryData<MeResponse>(sessionQueryKey, (previous) =>
    previous ? { ...previous, shortcuts: data.shortcuts ?? {} } : previous,
  )
}

export function useSaveShortcutBindings() {
  const queryClient = useQueryClient()
  return useMutation<ShortcutsResponse, Error, ShortcutBindings>({
    mutationFn: (shortcuts) => unwrap(api.PUT('/me/shortcuts', { body: { shortcuts } })),
    onSuccess: (data) => patchSession(queryClient, data),
  })
}

export function useResetShortcutBindings() {
  const queryClient = useQueryClient()
  return useMutation<ShortcutsResponse, Error, void>({
    mutationFn: () => unwrap(api.DELETE('/me/shortcuts')),
    onSuccess: (data) => patchSession(queryClient, data),
  })
}
