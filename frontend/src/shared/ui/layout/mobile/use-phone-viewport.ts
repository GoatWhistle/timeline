import { useEffect, useState } from 'react'
import { PHONE_QUERY } from './mobile-state'

function matchesPhone(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia(PHONE_QUERY).matches
}

export function usePhoneViewport(): boolean {
  const [phone, setPhone] = useState(matchesPhone)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const media = window.matchMedia(PHONE_QUERY)
    const sync = () => {
      setPhone(media.matches)
    }
    sync()
    media.addEventListener('change', sync)
    return () => {
      media.removeEventListener('change', sync)
    }
  }, [])

  return phone
}
