import { type RefObject, useCallback, useRef } from 'react'
import type { CalendarSpan } from './calendar-items'
import { momentsOf } from './row-items'

export type MomentCursor = {
  step: (span: CalendarSpan | undefined, delta: 1 | -1) => string | undefined
  activate: (span: CalendarSpan | undefined) => boolean
  reset: () => void
}

export function markElement(
  canvas: RefObject<HTMLElement | null>,
  momentId: string,
): HTMLElement | undefined {
  const found = canvas.current?.querySelector(`[data-schedule-mark="${cssEscape(momentId)}"]`)
  return found instanceof HTMLElement ? found : undefined
}

function cssEscape(value: string): string {
  return value.replace(/["\\]/g, '\\$&')
}

export function useMomentCursor(canvas: RefObject<HTMLElement | null>): MomentCursor {
  const index = useRef(-1)

  const reset = useCallback(() => {
    index.current = -1
  }, [])

  const step = useCallback(
    (span: CalendarSpan | undefined, delta: 1 | -1) => {
      const moments = span ? momentsOf(span.items) : []
      if (moments.length === 0) {
        index.current = -1
        return undefined
      }

      const next = Math.min(Math.max(index.current + delta, 0), moments.length - 1)
      index.current = next

      const moment = moments[next]
      if (!moment) return undefined

      markElement(canvas, moment.id)?.focus()
      return moment.id
    },
    [canvas],
  )

  const activate = useCallback(
    (span: CalendarSpan | undefined) => {
      const moments = span ? momentsOf(span.items) : []
      const moment = moments[index.current]
      if (!moment) return false

      markElement(canvas, moment.id)?.click()
      return true
    },
    [canvas],
  )

  return { step, activate, reset }
}
