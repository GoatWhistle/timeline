import { TZDate } from '@date-fns/tz'
import { format, isValid, parseISO } from 'date-fns'
import { currentTimeZone } from './datetime'

export type Civil = { date: string; time: string }

export const EMPTY_CIVIL: Civil = { date: '', time: '' }

const DATE_SHAPE = /^\d{4}-\d{2}-\d{2}$/
const TIME_SHAPE = /^\d{2}:\d{2}$/

export function isCivilDate(value: string): boolean {
  if (!DATE_SHAPE.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  if (month === undefined || day === undefined || year === undefined) return false
  if (month < 1 || month > 12 || day < 1 || day > 31) return false
  const probe = new Date(Date.UTC(year, month - 1, day))
  return probe.getUTCFullYear() === year && probe.getUTCMonth() === month - 1
    ? probe.getUTCDate() === day
    : false
}

export function isCivilTime(value: string): boolean {
  if (!TIME_SHAPE.test(value)) return false
  const [hours, minutes] = value.split(':').map(Number)
  if (hours === undefined || minutes === undefined) return false
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59
}

export function isCivil(value: Civil): boolean {
  return isCivilDate(value.date) && isCivilTime(value.time)
}

export function civilFromIso(iso: string | null | undefined, zone = currentTimeZone()): Civil {
  if (!iso) return EMPTY_CIVIL
  const parsed = parseISO(iso)
  if (!isValid(parsed)) return EMPTY_CIVIL
  const zoned = new TZDate(parsed, zone)
  return { date: format(zoned, 'yyyy-MM-dd'), time: format(zoned, 'HH:mm') }
}

export function civilToIso(value: Civil, zone = currentTimeZone()): string | null {
  if (!isCivil(value)) return null
  const [year, month, day] = value.date.split('-').map(Number)
  const [hours, minutes] = value.time.split(':').map(Number)
  if (
    year === undefined ||
    month === undefined ||
    day === undefined ||
    hours === undefined ||
    minutes === undefined
  ) {
    return null
  }
  const zoned = new TZDate(year, month - 1, day, hours, minutes, 0, 0, zone)
  const instant = zoned.getTime()
  return Number.isNaN(instant) ? null : new Date(instant).toISOString()
}

export function civilToUtcDays(date: string): number | null {
  if (!isCivilDate(date)) return null
  const [year, month, day] = date.split('-').map(Number)
  if (year === undefined || month === undefined || day === undefined) return null
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000)
}

export function compareCivilDates(left: string, right: string): number {
  const a = civilToUtcDays(left)
  const b = civilToUtcDays(right)
  if (a === null || b === null) return 0
  return a - b
}

export function compareCivil(left: Civil, right: Civil): number {
  const byDate = compareCivilDates(left.date, right.date)
  if (byDate !== 0) return byDate
  return left.time.localeCompare(right.time)
}

export function zoneOffsetLabel(value: Civil, zone = currentTimeZone()): string {
  const iso = civilToIso(value, zone)
  const at = iso ? new Date(iso) : new Date()
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: zone,
    timeZoneName: 'shortOffset',
  }).formatToParts(at)
  return parts.find((part) => part.type === 'timeZoneName')?.value ?? ''
}
