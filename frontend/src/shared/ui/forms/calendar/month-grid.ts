import { civilToUtcDays, compareCivilDates, isCivilDate } from '@/shared/datetime/civil'

export type CalendarDay = {
  date: string
  dayOfMonth: number
  outside: boolean
  weekend: boolean
}

export type CalendarMonth = { year: number; month: number }

const MS_PER_DAY = 86_400_000

export function fromUtcDays(days: number): string {
  const at = new Date(days * MS_PER_DAY)
  const year = String(at.getUTCFullYear()).padStart(4, '0')
  const month = String(at.getUTCMonth() + 1).padStart(2, '0')
  const day = String(at.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function addDaysTo(date: string, amount: number): string {
  const days = civilToUtcDays(date)
  return days === null ? date : fromUtcDays(days + amount)
}

export function monthOf(date: string): CalendarMonth {
  const [year, month] = date.split('-').map(Number)
  return { year: year ?? 1970, month: (month ?? 1) - 1 }
}

export function shiftMonth({ year, month }: CalendarMonth, amount: number): CalendarMonth {
  const total = year * 12 + month + amount
  return { year: Math.floor(total / 12), month: ((total % 12) + 12) % 12 }
}

function daysInMonth({ year, month }: CalendarMonth): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
}

export function clampToMonth(date: string, month: CalendarMonth): string {
  const day = Math.min(Number(date.slice(8, 10)), daysInMonth(month))
  return fromUtcDays(Date.UTC(month.year, month.month, day) / MS_PER_DAY)
}

function mondayIndex(weekday: number): number {
  return (weekday + 6) % 7
}

export function startOfGrid(month: CalendarMonth): number {
  const first = Date.UTC(month.year, month.month, 1) / MS_PER_DAY
  const weekday = new Date(first * MS_PER_DAY).getUTCDay()
  return first - mondayIndex(weekday)
}

export function buildMonthGrid(month: CalendarMonth): CalendarDay[] {
  const start = startOfGrid(month)
  const cells: CalendarDay[] = []
  for (let index = 0; index < 42; index += 1) {
    const days = start + index
    const at = new Date(days * MS_PER_DAY)
    const weekday = at.getUTCDay()
    cells.push({
      date: fromUtcDays(days),
      dayOfMonth: at.getUTCDate(),
      outside: at.getUTCMonth() !== month.month || at.getUTCFullYear() !== month.year,
      weekend: weekday === 0 || weekday === 6,
    })
  }
  return cells
}

export function startOfWeek(date: string): string {
  const days = civilToUtcDays(date)
  if (days === null) return date
  const weekday = new Date(days * MS_PER_DAY).getUTCDay()
  return fromUtcDays(days - mondayIndex(weekday))
}

export function endOfWeek(date: string): string {
  return addDaysTo(startOfWeek(date), 6)
}

export type DayBounds = { min?: string | undefined; max?: string | undefined }

export function isOutOfBounds(date: string, bounds: DayBounds): boolean {
  if (!isCivilDate(date)) return true
  if (bounds.min && isCivilDate(bounds.min) && compareCivilDates(date, bounds.min) < 0) return true
  if (bounds.max && isCivilDate(bounds.max) && compareCivilDates(date, bounds.max) > 0) return true
  return false
}

export function withinRange(date: string, from: string, to: string): boolean {
  if (!isCivilDate(from) || !isCivilDate(to)) return false
  return compareCivilDates(date, from) > 0 && compareCivilDates(date, to) < 0
}

export function nearestAllowed(date: string, bounds: DayBounds): string {
  if (bounds.min && isCivilDate(bounds.min) && compareCivilDates(date, bounds.min) < 0) {
    return bounds.min
  }
  if (bounds.max && isCivilDate(bounds.max) && compareCivilDates(date, bounds.max) > 0) {
    return bounds.max
  }
  return date
}
