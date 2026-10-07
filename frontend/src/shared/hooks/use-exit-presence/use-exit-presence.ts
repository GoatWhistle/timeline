import { useEffect, useState } from 'react'

export const EXIT_MS = 140

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false
}

export function useExitPresence(show: boolean, exitMs = EXIT_MS) {
  const [rendered, setRendered] = useState(show)
  const [previous, setPrevious] = useState(show)

  if (show !== previous) {
    setPrevious(show)
    if (show) setRendered(true)
  }

  const leaving = rendered && !show

  useEffect(() => {
    if (!leaving) return
    const id = window.setTimeout(() => setRendered(false), prefersReducedMotion() ? 0 : exitMs)
    return () => window.clearTimeout(id)
  }, [leaving, exitMs])

  return { rendered, leaving }
}
