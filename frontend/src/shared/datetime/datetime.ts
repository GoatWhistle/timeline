import { TZDate } from '@date-fns/tz'
import { format, formatDistanceStrict, isValid, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'

export const SYSTEM_TIME_ZONE = 'Europe/Moscow'

function toZoned(iso: string | null | undefined): TZDate | null {
  if (!iso) return null
  const parsed = parseISO(iso)
  if (!isValid(parsed)) return null
  return new TZDate(parsed, SYSTEM_TIME_ZONE)
}

export function formatDateTime(iso: string | null | undefined): string {
  const date = toZoned(iso)
  return date ? format(date, 'd MMMM yyyy, HH:mm', { locale: ru }) : '—'
}

export function formatDate(iso: string | null | undefined): string {
  const date = toZoned(iso)
  return date ? format(date, 'd MMMM yyyy', { locale: ru }) : '—'
}

export function formatDateShort(iso: string | null | undefined): string {
  const date = toZoned(iso)
  return date ? format(date, 'dd.MM.yyyy') : '—'
}

export function formatRelative(iso: string | null | undefined, base: Date = new Date()): string {
  const date = toZoned(iso)
  if (!date) return '—'
  const distance = formatDistanceStrict(date, base, { locale: ru, addSuffix: true })
  return distance
}

export function formatOffsetMinutes(offsetMinutes: number): string {
  if (offsetMinutes === 0) return 'в момент дедлайна'
  const total = Math.abs(offsetMinutes)
  const days = Math.floor(total / 1440)
  const hours = Math.floor((total % 1440) / 60)
  const minutes = total % 60
  const parts: string[] = []
  if (days) parts.push(`${days} дн.`)
  if (hours) parts.push(`${hours} ч.`)
  if (minutes) parts.push(`${minutes} мин.`)
  const amount = parts.join(' ')
  return offsetMinutes > 0 ? `за ${amount} до дедлайна` : `через ${amount} после дедлайна`
}
