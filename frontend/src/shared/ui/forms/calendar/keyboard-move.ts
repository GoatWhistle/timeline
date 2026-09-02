import {
  addDaysTo,
  clampToMonth,
  type DayBounds,
  endOfWeek,
  monthOf,
  nearestAllowed,
  shiftMonth,
  startOfWeek,
} from './month-grid'

export type CalendarCommand =
  | { kind: 'move'; date: string }
  | { kind: 'select' }
  | { kind: 'close' }

export function resolveKey(
  key: string,
  shiftKey: boolean,
  focused: string,
  bounds: DayBounds,
): CalendarCommand | null {
  const moved = nextDate(key, shiftKey, focused)
  if (moved !== null) return { kind: 'move', date: nearestAllowed(moved, bounds) }
  if (key === 'Enter' || key === ' ') return { kind: 'select' }
  if (key === 'Escape') return { kind: 'close' }
  return null
}

function nextDate(key: string, shiftKey: boolean, focused: string): string | null {
  switch (key) {
    case 'ArrowLeft':
      return addDaysTo(focused, -1)
    case 'ArrowRight':
      return addDaysTo(focused, 1)
    case 'ArrowUp':
      return addDaysTo(focused, -7)
    case 'ArrowDown':
      return addDaysTo(focused, 7)
    case 'Home':
      return startOfWeek(focused)
    case 'End':
      return endOfWeek(focused)
    case 'PageUp':
      return clampToMonth(focused, shiftMonth(monthOf(focused), shiftKey ? -12 : -1))
    case 'PageDown':
      return clampToMonth(focused, shiftMonth(monthOf(focused), shiftKey ? 12 : 1))
    default:
      return null
  }
}
