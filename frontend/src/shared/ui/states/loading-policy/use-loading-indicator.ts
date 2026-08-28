import { useEffect, useRef, useState } from 'react'
import {
  decideIndicator,
  type LoadingIndicator,
  type LoadingShape,
  SKELETON_DELAY_MS,
  SKELETON_MIN_MS,
  SPINNER_DELAY_MS,
} from './loading-policy'

export function useLoadingIndicator({
  isPending,
  isFetching = false,
  hasData = false,
  shape = 'known',
}: {
  isPending: boolean
  isFetching?: boolean
  hasData?: boolean
  shape?: LoadingShape
}): LoadingIndicator {
  const [armed, setArmed] = useState(false)
  const [held, setHeld] = useState(false)
  const shownAt = useRef<number | null>(null)

  useEffect(() => {
    if (!isPending || hasData) {
      setArmed(false)
      return
    }
    const delay = shape === 'known' ? SKELETON_DELAY_MS : SPINNER_DELAY_MS
    const timer = window.setTimeout(() => {
      shownAt.current = Date.now()
      setArmed(true)
    }, delay)
    return () => window.clearTimeout(timer)
  }, [isPending, hasData, shape])

  useEffect(() => {
    if (isPending || shownAt.current === null) return
    const shownFor = Date.now() - shownAt.current
    if (shownFor >= SKELETON_MIN_MS) {
      shownAt.current = null
      setHeld(false)
      return
    }
    setHeld(true)
    const timer = window.setTimeout(() => {
      shownAt.current = null
      setHeld(false)
    }, SKELETON_MIN_MS - shownFor)
    return () => window.clearTimeout(timer)
  }, [isPending])

  return decideIndicator({
    isPending,
    isFetching,
    hasData,
    shape,
    elapsedMs: armed ? SPINNER_DELAY_MS : 0,
    shownSinceMs: held ? 0 : null,
  })
}
