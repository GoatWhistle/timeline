import { useEffect, useState } from 'react'
import { PHONE_QUERY, TOUCH_QUERY } from './mobile-state'

function matches(query: string): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia(query).matches
}

export function useMediaQuery(query: string): boolean {
  const [active, setActive] = useState(() => matches(query))

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const media = window.matchMedia(query)
    const sync = () => {
      setActive(media.matches)
    }
    sync()
    media.addEventListener('change', sync)
    return () => {
      media.removeEventListener('change', sync)
    }
  }, [query])

  return active
}

export function usePhoneViewport(): boolean {
  return useMediaQuery(PHONE_QUERY)
}

export function useTouchViewport(): boolean {
  return useMediaQuery(TOUCH_QUERY)
}
