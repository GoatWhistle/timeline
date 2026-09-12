import { Suspense, useEffect, useRef } from 'react'
import { useLocation, useOutlet } from 'react-router'
import { CrossfadeSwap } from '@/shared/ui/motion/crossfade-swap'
import { RouteFallback } from './route-fallback'

const DOOR_ORDER: RegExp[] = [
  /^\/login$/,
  /^\/register$/,
  /^\/verify-email$/,
  /^\/forgot-password$/,
  /^\/reset-password$/,
  /^\/invite\/[^/]+$/,
]

function doorRank(pathname: string): number {
  return DOOR_ORDER.findIndex((pattern) => pattern.test(pathname))
}

const FIELD_SELECTOR = 'input, textarea, select'
const FOCUS_RETRY_DELAYS_MS = [0, 20, 100, 200, 400, 800]

let focusAttemptGeneration = 0

function focusFirstField(node: HTMLElement | null) {
  if (!node) return
  const generation = ++focusAttemptGeneration
  let ownFocusPending = false
  let userTookOver = false
  const onFocusIn = () => {
    if (!ownFocusPending) userTookOver = true
    ownFocusPending = false
  }
  document.addEventListener('focusin', onFocusIn, { capture: true })
  for (const delay of FOCUS_RETRY_DELAYS_MS) {
    setTimeout(() => {
      if (userTookOver || generation !== focusAttemptGeneration) return
      const field = node.isConnected
        ? node.querySelector<HTMLElement>(FIELD_SELECTOR)
        : document.querySelector<HTMLElement>(FIELD_SELECTOR)
      if (field && document.activeElement !== field) {
        ownFocusPending = true
        field.focus()
      }
    }, delay)
  }
  setTimeout(() => document.removeEventListener('focusin', onFocusIn, { capture: true }), 1000)
}

export function AuthOutletSwap() {
  const location = useLocation()
  const outlet = useOutlet()
  const previousRank = useRef(doorRank(location.pathname))

  const rank = doorRank(location.pathname)
  const direction =
    rank === -1 || previousRank.current === -1 || rank === previousRank.current
      ? undefined
      : rank > previousRank.current
        ? 'left'
        : 'right'

  useEffect(() => {
    previousRank.current = rank
  }, [rank])

  return (
    <CrossfadeSwap
      swapKey={location.pathname}
      direction={direction}
      onEntered={focusFirstField}
      className="w-full max-w-sm"
    >
      <Suspense fallback={<RouteFallback />}>{outlet}</Suspense>
    </CrossfadeSwap>
  )
}
