import { addDays } from 'date-fns'
import { type KeyboardEvent, type RefObject, useCallback, useState } from 'react'
import { dayKey } from './month-grid'
import { resolveBarKey, resolveDayKey } from './wrapped-keys'

export type WrappedFocusOptions = {
  container: RefObject<HTMLDivElement | null>
  first: Date
  last: Date
  now: Date
  onClear: () => void
  onSelect: (id: string) => void
  onOpen: (id: string) => void
}

function barsOfDay(container: HTMLElement | null, key: string): HTMLElement[] {
  if (!container) return []
  return [...container.querySelectorAll(`[data-schedule-bar-day~="${key}"]`)].filter(
    (element): element is HTMLElement => element instanceof HTMLElement,
  )
}

export function useWrappedFocus({
  container,
  first,
  last,
  now,
  onClear,
  onSelect,
  onOpen,
}: WrappedFocusOptions) {
  const [cursor, setCursor] = useState<Date>(() => (now >= first && now <= last ? now : first))

  const focusDay = useCallback(
    (date: Date) => {
      setCursor(date)
      const target = container.current?.querySelector(`[data-schedule-day="${dayKey(date)}"]`)
      if (target instanceof HTMLElement) target.focus()
    },
    [container],
  )

  const focusBar = useCallback(
    (element: HTMLElement | undefined) => {
      if (!element) return false
      element.focus()
      const id = element.dataset.scheduleItem
      if (id) onSelect(id)
      return true
    },
    [onSelect],
  )

  const onDayKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      const action = resolveDayKey(event.key)
      if (!action) return

      if (action.type === 'move') {
        event.preventDefault()
        const next = addDays(cursor, action.days)
        if (next >= first && next <= last) focusDay(next)
        return
      }

      if (action.type === 'edge') {
        event.preventDefault()
        focusDay(action.to === 'first' ? first : last)
        return
      }

      if (action.type === 'today') {
        event.preventDefault()
        if (now >= first && now <= last) focusDay(now)
        return
      }

      if (action.type === 'clear') {
        event.preventDefault()
        onClear()
        return
      }

      if (action.type === 'enterBars') {
        const found = barsOfDay(container.current, dayKey(cursor))
        if (found.length === 0) return
        event.preventDefault()
        focusBar(found[0])
      }
    },
    [cursor, first, last, now, focusDay, focusBar, container, onClear],
  )

  const onBarKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>, id: string) => {
      const action = resolveBarKey(event.key)
      if (!action) return

      if (action.type === 'open') {
        event.preventDefault()
        onOpen(id)
        return
      }

      if (action.type === 'leaveBars') {
        event.preventDefault()
        focusDay(cursor)
        return
      }

      if (action.type === 'stepBar') {
        const found = barsOfDay(container.current, dayKey(cursor))
        const at = found.findIndex((element) => element.dataset.scheduleItem === id)
        const next = found[at + action.delta]
        if (!next) return
        event.preventDefault()
        focusBar(next)
      }
    },
    [cursor, container, focusDay, focusBar, onOpen],
  )

  return { cursor, setCursor, focusDay, onDayKeyDown, onBarKeyDown }
}
