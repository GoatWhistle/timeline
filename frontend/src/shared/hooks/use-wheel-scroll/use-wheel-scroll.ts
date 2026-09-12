import { useCallback, useEffect, useRef } from 'react'

export function canScrollBy(element: HTMLElement, deltaY: number): boolean {
  const remaining =
    deltaY > 0 ? element.scrollHeight - element.clientHeight - element.scrollTop : element.scrollTop
  return remaining > 1
}

export function applyWheel(element: HTMLElement, event: WheelEvent): boolean {
  if (event.deltaY === 0) return false
  if (!canScrollBy(element, event.deltaY)) return false
  element.scrollTop += event.deltaY
  event.preventDefault()
  return true
}

export function useWheelScroll<T extends HTMLElement>(): (node: T | null) => void {
  const node = useRef<T | null>(null)

  const handle = useCallback((event: WheelEvent) => {
    const element = node.current
    if (element) applyWheel(element, event)
  }, [])

  useEffect(() => {
    return () => {
      node.current?.removeEventListener('wheel', handle)
    }
  }, [handle])

  return useCallback(
    (next: T | null) => {
      node.current?.removeEventListener('wheel', handle)
      node.current = next
      next?.addEventListener('wheel', handle, { passive: false })
    },
    [handle],
  )
}
