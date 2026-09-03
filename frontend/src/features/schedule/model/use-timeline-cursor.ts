import { type KeyboardEvent, type RefObject, useCallback, useState } from 'react'
import type { CalendarSpan } from './calendar-items'
import { clampIndex, type NavigableSpan, resolveKey } from './grid-navigation'
import type { PackedSpan } from './pack-lanes'
import { type MomentCursor, markElement } from './use-moment-cursor'

const PAGE_FRACTION = 0.9

export type TimelineCursorOptions = {
  viewport: RefObject<HTMLElement | null>
  canvas: RefObject<HTMLElement | null>
  ordered: readonly PackedSpan<CalendarSpan>[]
  navigable: readonly NavigableSpan[]
  dayWidth: number
  momentCursor: MomentCursor
  announce: (message: string) => void
  sentenceOf: (span: CalendarSpan) => string
  openSpan: (span: CalendarSpan) => void
  onToday?: () => void
  onZoom?: (direction: 1 | -1) => void
}

export type TimelineCursor = {
  cursor: number
  setCursor: (index: number) => void
  cursorId: string | undefined
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void
}

export function useTimelineCursor({
  viewport,
  canvas,
  ordered,
  navigable,
  dayWidth,
  momentCursor,
  announce,
  sentenceOf,
  openSpan,
  onToday,
  onZoom,
}: TimelineCursorOptions): TimelineCursor {
  const [cursor, setCursor] = useState(0)

  const revealSpan = useCallback(
    (index: number) => {
      const entry = ordered[index]
      const element = viewport.current
      if (!entry || !element) return

      const left = entry.startDay * dayWidth
      const right = (entry.endDay + 1) * dayWidth

      if (left < element.scrollLeft) element.scrollLeft = left - dayWidth
      else if (right > element.scrollLeft + element.clientWidth) {
        element.scrollLeft = right - element.clientWidth + dayWidth
      }
    },
    [ordered, dayWidth, viewport],
  )

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      const action = resolveKey(event.key, navigable, cursor)
      if (!action) return
      event.preventDefault()

      if (action.type === 'today') {
        onToday?.()
        return
      }
      if (action.type === 'zoomIn' || action.type === 'zoomOut') {
        onZoom?.(action.type === 'zoomIn' ? 1 : -1)
        return
      }
      if (action.type === 'scroll') {
        const element = viewport.current
        if (element) element.scrollLeft += action.delta * element.clientWidth * PAGE_FRACTION
        return
      }
      if (action.type === 'open') {
        const entry = ordered[clampIndex(navigable, cursor)]
        if (entry) openSpan(entry.item)
        return
      }
      if (action.type === 'moment') {
        const entry = ordered[clampIndex(navigable, cursor)]
        const momentId = momentCursor.step(entry?.item, action.delta)
        const label = momentId
          ? (markElement(canvas, momentId)?.getAttribute('aria-label') ?? '')
          : ''
        announce(label)
        return
      }
      if (action.type === 'openMoment') {
        momentCursor.activate(ordered[clampIndex(navigable, cursor)]?.item)
        return
      }

      momentCursor.reset()
      setCursor(action.index)
      revealSpan(action.index)
      const entry = ordered[action.index]
      announce(entry ? sentenceOf(entry.item) : '')
    },
    [
      navigable,
      ordered,
      cursor,
      openSpan,
      onToday,
      onZoom,
      announce,
      sentenceOf,
      momentCursor,
      revealSpan,
      viewport,
      canvas,
    ],
  )

  return {
    cursor,
    setCursor,
    cursorId: navigable[clampIndex(navigable, cursor)]?.id,
    onKeyDown,
  }
}
