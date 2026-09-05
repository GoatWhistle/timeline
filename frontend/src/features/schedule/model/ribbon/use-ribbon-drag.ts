import { type RefObject, useEffect, useState } from 'react'

export const DRAG_SLOP = 4

export function useRibbonDrag(viewport: RefObject<HTMLElement | null>): boolean {
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    const element = viewport.current
    if (!element) return

    let pointerId: number | undefined
    let originX = 0
    let originScroll = 0
    let passedSlop = false

    const release = () => {
      if (pointerId !== undefined && element.hasPointerCapture(pointerId)) {
        element.releasePointerCapture(pointerId)
      }
      pointerId = undefined
      passedSlop = false
      setDragging(false)
    }

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || event.pointerType !== 'mouse') return
      if (element.scrollWidth <= element.clientWidth) return
      pointerId = event.pointerId
      originX = event.clientX
      originScroll = element.scrollLeft
      passedSlop = false
    }

    const onPointerMove = (event: PointerEvent) => {
      if (pointerId !== event.pointerId) return
      const travelled = event.clientX - originX
      if (!passedSlop) {
        if (Math.abs(travelled) < DRAG_SLOP) return
        passedSlop = true
        setDragging(true)
        element.setPointerCapture(pointerId)
      }
      event.preventDefault()
      element.scrollLeft = originScroll - travelled
    }

    const onClick = (event: MouseEvent) => {
      if (!passedSlop) return
      event.stopPropagation()
      event.preventDefault()
    }

    element.addEventListener('pointerdown', onPointerDown)
    element.addEventListener('pointermove', onPointerMove)
    element.addEventListener('pointerup', release)
    element.addEventListener('pointercancel', release)
    element.addEventListener('click', onClick, true)

    return () => {
      element.removeEventListener('pointerdown', onPointerDown)
      element.removeEventListener('pointermove', onPointerMove)
      element.removeEventListener('pointerup', release)
      element.removeEventListener('pointercancel', release)
      element.removeEventListener('click', onClick, true)
      release()
    }
  }, [viewport])

  return dragging
}
