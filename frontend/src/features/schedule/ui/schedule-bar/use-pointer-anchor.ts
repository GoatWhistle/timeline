import { useCallback, useEffect, useRef, useState } from 'react'

const OPEN_DELAY = 400

export type AnchorPlacement = { left: number; top: number } | null

export function usePointerAnchor(): {
  anchorRef: React.RefObject<HTMLSpanElement | null>
  open: boolean
  fromPointer: boolean
  onPointerMove: (event: React.PointerEvent<HTMLElement>) => void
  onPointerLeave: () => void
  onFocus: () => void
  onBlur: () => void
  setOpen: (next: boolean) => void
} {
  const anchorRef = useRef<HTMLSpanElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [open, setOpen] = useState(false)
  const [fromPointer, setFromPointer] = useState(false)

  const clear = useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current)
      timer.current = null
    }
  }, [])

  useEffect(() => clear, [clear])

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (event.pointerType !== 'mouse') return
      const anchor = anchorRef.current
      const host = anchor?.parentElement
      if (!anchor || !host) return
      const box = host.getBoundingClientRect()
      const bar = event.currentTarget.getBoundingClientRect()
      anchor.style.left = `${event.clientX - box.left}px`
      anchor.style.top = `${bar.top - box.top}px`
      setFromPointer(true)
      if (open || timer.current !== null) return
      timer.current = setTimeout(() => {
        timer.current = null
        setOpen(true)
      }, OPEN_DELAY)
    },
    [open],
  )

  const onPointerLeave = useCallback(() => {
    clear()
    setOpen(false)
  }, [clear])

  const onFocus = useCallback(() => {
    clear()
    setFromPointer(false)
    setOpen(true)
  }, [clear])

  const onBlur = useCallback(() => {
    clear()
    setOpen(false)
  }, [clear])

  return { anchorRef, open, fromPointer, onPointerMove, onPointerLeave, onFocus, onBlur, setOpen }
}
