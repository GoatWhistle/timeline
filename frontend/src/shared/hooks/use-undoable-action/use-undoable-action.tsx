import { useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

export const UNDO_WINDOW_MS = 8000

type Pending = {
  timer: ReturnType<typeof setTimeout>
  toastId: string | number
}

export function useUndoableAction() {
  const { t } = useTranslation()
  const pending = useRef<Map<string, Pending>>(new Map())

  useEffect(() => {
    const registry = pending.current
    return () => {
      for (const entry of registry.values()) clearTimeout(entry.timer)
      registry.clear()
    }
  }, [])

  return useCallback(
    ({
      key,
      message,
      description,
      run,
      onUndo,
    }: {
      key: string
      message: string
      description?: string
      run: () => undefined | Promise<unknown>
      onUndo?: () => void
    }) => {
      const existing = pending.current.get(key)
      if (existing) {
        clearTimeout(existing.timer)
        toast.dismiss(existing.toastId)
        pending.current.delete(key)
      }

      const timer = setTimeout(() => {
        pending.current.delete(key)
        void Promise.resolve(run()).catch(() => undefined)
      }, UNDO_WINDOW_MS)

      const toastId = toast(message, {
        description,
        duration: UNDO_WINDOW_MS,
        action: {
          label: t('action.undo'),
          onClick: () => {
            const entry = pending.current.get(key)
            if (!entry) return
            clearTimeout(entry.timer)
            pending.current.delete(key)
            onUndo?.()
          },
        },
      })

      pending.current.set(key, { timer, toastId })
    },
    [t],
  )
}
