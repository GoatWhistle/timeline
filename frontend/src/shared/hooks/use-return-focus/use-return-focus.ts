import { useCallback, useEffect, useRef } from 'react'

function isFocusable(node: unknown): node is HTMLElement {
  return (
    typeof HTMLElement !== 'undefined' &&
    node instanceof HTMLElement &&
    typeof node.focus === 'function' &&
    node.isConnected
  )
}

export function useReturnFocus(open: boolean): (event?: Event) => void {
  const origin = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    const active = document.activeElement
    origin.current = isFocusable(active) && active !== document.body ? active : null
  }, [open])

  return useCallback((event?: Event) => {
    const target = origin.current
    origin.current = null
    if (!isFocusable(target)) return
    event?.preventDefault()
    target.focus({ preventScroll: true })
  }, [])
}
