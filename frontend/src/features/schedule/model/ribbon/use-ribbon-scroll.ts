import { type RefObject, useCallback, useEffect, useRef, useState } from 'react'

export const RIBBON_PAGE_FRACTION = 0.85

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function scrollElement(element: HTMLElement, left: number, smooth: boolean): void {
  if (typeof element.scrollTo !== 'function') {
    element.scrollLeft = left
    return
  }
  element.scrollTo({ left, behavior: smooth ? 'smooth' : 'auto' })
}

export type RibbonScroll = {
  scrollLeft: number
  scrollTo: (left: number, smooth?: boolean) => void
}

export function useRibbonScroll(viewport: RefObject<HTMLElement | null>): RibbonScroll {
  const [scrollLeft, setScrollLeft] = useState(0)
  const frame = useRef<number | undefined>(undefined)

  useEffect(() => {
    const element = viewport.current
    if (!element) return

    const read = () => {
      frame.current = undefined
      setScrollLeft(element.scrollLeft)
    }

    const onScroll = () => {
      if (frame.current !== undefined) return
      frame.current = requestAnimationFrame(read)
    }

    element.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      element.removeEventListener('scroll', onScroll)
      if (frame.current !== undefined) cancelAnimationFrame(frame.current)
      frame.current = undefined
    }
  }, [viewport])

  const scrollTo = useCallback(
    (left: number, smooth = true) => {
      const element = viewport.current
      if (!element) return
      scrollElement(element, left, smooth && !prefersReducedMotion())
    },
    [viewport],
  )

  return { scrollLeft, scrollTo }
}
