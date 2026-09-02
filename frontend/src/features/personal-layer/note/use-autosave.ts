import { useCallback, useEffect, useRef, useState } from 'react'

export const AUTOSAVE_DELAY_MS = 900

export type SaveState = 'idle' | 'saving' | 'saved' | 'failed'

export function useAutosave(
  save: (value: string) => Promise<unknown>,
  delay = AUTOSAVE_DELAY_MS,
): {
  state: SaveState
  schedule: (value: string) => void
  flush: () => void
} {
  const [state, setState] = useState<SaveState>('idle')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingValue = useRef<string | null>(null)
  const saveRef = useRef(save)
  saveRef.current = save

  const run = useCallback(async (value: string) => {
    setState('saving')
    try {
      await saveRef.current(value)
      setState('saved')
    } catch {
      setState('failed')
    }
  }, [])

  const flush = useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current)
      timer.current = null
    }
    const value = pendingValue.current
    pendingValue.current = null
    if (value !== null) void run(value)
  }, [run])

  const schedule = useCallback(
    (value: string) => {
      pendingValue.current = value
      setState('idle')
      if (timer.current !== null) clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        timer.current = null
        const next = pendingValue.current
        pendingValue.current = null
        if (next !== null) void run(next)
      }, delay)
    },
    [delay, run],
  )

  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current)
    },
    [],
  )

  return { state, schedule, flush }
}
