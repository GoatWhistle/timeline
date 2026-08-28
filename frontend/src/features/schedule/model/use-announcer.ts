import { useCallback, useEffect, useRef, useState } from 'react'
import { ANNOUNCE_DELAY } from './schedule-scale'

export function useAnnouncer(delay: number = ANNOUNCE_DELAY) {
  const [message, setMessage] = useState('')
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const announce = useCallback(
    (next: string) => {
      if (timerRef.current !== undefined) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setMessage(next), delay)
    },
    [delay],
  )

  useEffect(
    () => () => {
      if (timerRef.current !== undefined) clearTimeout(timerRef.current)
    },
    [],
  )

  return { message, announce }
}
