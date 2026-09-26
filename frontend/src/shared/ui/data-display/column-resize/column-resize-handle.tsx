import { type PointerEvent, useRef, useState } from 'react'
import { cn } from '@/shared/styling/class-names/class-names'

const KEY_STEP = 16
const KEY_STEP_LARGE = 64

function cellWidth(handle: HTMLElement, fallback: number): number {
  return handle.parentElement?.getBoundingClientRect().width || fallback
}

export function ColumnResizeHandle({
  label,
  width,
  onResize,
  onReset,
}: {
  label: string
  width: number
  onResize: (width: number) => void
  onReset: () => void
}) {
  const drag = useRef<{ x: number; start: number } | null>(null)
  const [dragging, setDragging] = useState(false)

  function stop(event: PointerEvent<HTMLButtonElement>) {
    drag.current = null
    setDragging(false)
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      data-column-resize=""
      data-dragging={dragging || undefined}
      onPointerDown={(event) => {
        if (event.button !== 0) return
        event.preventDefault()
        event.stopPropagation()
        drag.current = { x: event.clientX, start: cellWidth(event.currentTarget, width) }
        setDragging(true)
        event.currentTarget.setPointerCapture?.(event.pointerId)
      }}
      onPointerMove={(event) => {
        if (!drag.current) return
        onResize(drag.current.start + event.clientX - drag.current.x)
      }}
      onPointerUp={stop}
      onPointerCancel={stop}
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => {
        event.stopPropagation()
        onReset()
      }}
      onKeyDown={(event) => {
        const step = event.shiftKey ? KEY_STEP_LARGE : KEY_STEP
        const current = cellWidth(event.currentTarget, width)
        if (event.key === 'ArrowLeft') onResize(current - step)
        else if (event.key === 'ArrowRight') onResize(current + step)
        else if (event.key === 'Home') onReset()
        else return
        event.preventDefault()
      }}
      className={cn(
        'group/resize absolute inset-y-0 right-0 z-10 w-3 translate-x-1/2 cursor-col-resize',
        'touch-none select-none pointer-coarse:w-6',
        'focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring',
      )}
    >
      <span
        aria-hidden="true"
        data-resize-line=""
        className={cn(
          'absolute inset-y-2 left-1/2 w-px -translate-x-1/2 bg-border',
          'transition-colors duration-instant ease-out',
          'group-hover/resize:w-0.5 group-hover/resize:bg-ring',
          'group-data-dragging/resize:w-0.5 group-data-dragging/resize:bg-ring',
        )}
      />
    </button>
  )
}
