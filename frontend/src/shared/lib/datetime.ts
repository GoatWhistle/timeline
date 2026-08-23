import { TZDate } from '@date-fns/tz'
import { format, formatDistanceStrict, isValid, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'

/**
 * Системная таймзона отображения (раздел 9.6 ТЗ). Хранение и обмен — всегда UTC,
 * пользовательские таймзоны в MVP не поддерживаются.
 */
export const SYSTEM_TIME_ZONE = 'Europe/Moscow'

function toZoned(iso: string | null | undefined): TZDate | null {
  if (!iso) return null
  const parsed = parseISO(iso)
  if (!isValid(parsed)) return null
  return new TZDate(parsed, SYSTEM_TIME_ZONE)
}

/** Дата и время в системной таймзоне: «14 марта 2026, 18:00». */
export function formatDateTime(iso: string | null | undefined): string {
  const date = toZoned(iso)
  return date ? format(date, 'd MMMM yyyy, HH:mm', { locale: ru }) : '—'
}

/** Только дата: «14 марта 2026». */
export function formatDate(iso: string | null | undefined): string {
  const date = toZoned(iso)
  return date ? format(date, 'd MMMM yyyy', { locale: ru }) : '—'
}

/** Короткая дата для плотных таблиц и шкалы: «14.03.2026». */
export function formatDateShort(iso: string | null | undefined): string {
  const date = toZoned(iso)
  return date ? format(date, 'dd.MM.yyyy') : '—'
}

/** Относительный срок: «через 3 дня», «2 часа назад». */
export function formatRelative(iso: string | null | undefined, base: Date = new Date()): string {
  const date = toZoned(iso)
  if (!date) return '—'
  const distance = formatDistanceStrict(date, base, { locale: ru, addSuffix: true })
  return distance
}

/** Смещение правила уведомления в человеческий текст (раздел 9.1 ТЗ). */
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
