import { useCallback, useEffect, useMemo, useState } from 'react'
import { isCivilDate } from '@/shared/datetime/civil'
import { currentTimeZone } from '@/shared/datetime/datetime'
import { todayInZone } from './calendar-labels'
import { type CalendarCommand, resolveKey } from './keyboard-move'
import {
  type CalendarMonth,
  type DayBounds,
  monthOf,
  nearestAllowed,
  shiftMonth,
} from './month-grid'

export function useCalendar({
  value,
  bounds,
  open,
  onPick,
  onClose,
}: {
  value: string
  bounds: DayBounds
  open: boolean
  onPick: (date: string) => void
  onClose: () => void
}) {
  const today = useMemo(() => todayInZone(currentTimeZone()), [])
  const anchor = isCivilDate(value) ? value : nearestAllowed(today, bounds)
  const [focused, setFocused] = useState(anchor)
  const [month, setMonth] = useState<CalendarMonth>(() => monthOf(anchor))

  useEffect(() => {
    if (!open) return
    setFocused(anchor)
    setMonth(monthOf(anchor))
  }, [open, anchor])

  const moveTo = useCallback((date: string) => {
    setFocused(date)
    setMonth(monthOf(date))
  }, [])

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLElement>) => {
      const command: CalendarCommand | null = resolveKey(event.key, event.shiftKey, focused, bounds)
      if (command === null) return
      event.preventDefault()
      event.stopPropagation()
      if (command.kind === 'move') moveTo(command.date)
      if (command.kind === 'select') onPick(focused)
      if (command.kind === 'close') onClose()
    },
    [focused, bounds, moveTo, onPick, onClose],
  )

  const stepMonth = useCallback(
    (amount: number) => setMonth((current) => shiftMonth(current, amount)),
    [],
  )

  return { today, focused, month, moveTo, stepMonth, handleKeyDown }
}
