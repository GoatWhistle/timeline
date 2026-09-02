import type { Locale } from '@/shared/i18n/locale'
import { type CalendarMonth, fromUtcDays } from './month-grid'

const MS_PER_DAY = 86_400_000
const MONDAY = Date.UTC(2024, 0, 1) / MS_PER_DAY

function utcOf(date: string): Date {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1))
}

export function weekdayNames(locale: Locale): { short: string; long: string }[] {
  const shortFormat = new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' })
  const longFormat = new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC' })
  const names: { short: string; long: string }[] = []
  for (let index = 0; index < 7; index += 1) {
    const at = new Date((MONDAY + index) * MS_PER_DAY)
    names.push({ short: shortFormat.format(at), long: longFormat.format(at) })
  }
  return names
}

export function monthTitle({ year, month }: CalendarMonth, locale: Locale): string {
  const at = new Date(Date.UTC(year, month, 1))
  return new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(at)
}

export function dayLabel(date: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(utcOf(date))
}

export function shortDayLabel(date: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(utcOf(date))
}

export function todayInZone(zone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
  return parts
}

export function daysBetween(from: string, to: string): number {
  const start = utcOf(from).getTime() / MS_PER_DAY
  const end = utcOf(to).getTime() / MS_PER_DAY
  return Math.round(end - start)
}

export function isoWeekStart(date: string): string {
  const at = utcOf(date)
  const weekday = (at.getUTCDay() + 6) % 7
  return fromUtcDays(at.getTime() / MS_PER_DAY - weekday)
}
