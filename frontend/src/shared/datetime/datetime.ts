import { TZDate } from '@date-fns/tz'
import { addDays, format, formatDistanceStrict, isSameDay, isValid, parseISO } from 'date-fns'
import type { Locale as DateFnsLocale } from 'date-fns/locale'
import { enUS, ru } from 'date-fns/locale'
import { i18n } from '@/shared/i18n/config'
import { DEFAULT_LOCALE, isLocale, type Locale } from '@/shared/i18n/locale'

export const SYSTEM_TIME_ZONE = 'Europe/Moscow'

const DATE_FNS_LOCALES: Record<Locale, DateFnsLocale> = { ru, en: enUS }

const DATE_TIME_PATTERN: Record<Locale, string> = {
  ru: 'd MMMM yyyy, HH:mm',
  en: 'd MMMM yyyy, HH:mm',
}

const DATE_PATTERN: Record<Locale, string> = {
  ru: 'd MMMM yyyy',
  en: 'd MMMM yyyy',
}

const SHORT_DATE_PATTERN: Record<Locale, string> = {
  ru: 'dd.MM.yyyy',
  en: 'dd/MM/yyyy',
}

export function currentLocale(): Locale {
  const language = i18n.language?.split('-')[0]
  return isLocale(language) ? language : DEFAULT_LOCALE
}

function dateFnsLocale(locale: Locale): DateFnsLocale {
  return DATE_FNS_LOCALES[locale]
}

function toZoned(iso: string | null | undefined): TZDate | null {
  if (!iso) return null
  const parsed = parseISO(iso)
  if (!isValid(parsed)) return null
  return new TZDate(parsed, SYSTEM_TIME_ZONE)
}

export function formatDateTime(iso: string | null | undefined, locale = currentLocale()): string {
  const date = toZoned(iso)
  if (!date) return '—'
  return format(date, DATE_TIME_PATTERN[locale], { locale: dateFnsLocale(locale) })
}

export function formatDate(iso: string | null | undefined, locale = currentLocale()): string {
  const date = toZoned(iso)
  if (!date) return '—'
  return format(date, DATE_PATTERN[locale], { locale: dateFnsLocale(locale) })
}

export function formatDateShort(iso: string | null | undefined, locale = currentLocale()): string {
  const date = toZoned(iso)
  if (!date) return '—'
  return format(date, SHORT_DATE_PATTERN[locale], { locale: dateFnsLocale(locale) })
}

export function formatMonth(date: Date, locale = currentLocale()): string {
  return format(date, 'LLLL yyyy', { locale: dateFnsLocale(locale) })
}

export function formatMonthShort(date: Date, locale = currentLocale()): string {
  return format(date, 'LLL', { locale: dateFnsLocale(locale) })
}

export function formatRelative(
  iso: string | null | undefined,
  base: Date = new Date(),
  locale = currentLocale(),
): string {
  const date = toZoned(iso)
  if (!date) return '—'
  return formatDistanceStrict(date, base, { locale: dateFnsLocale(locale), addSuffix: true })
}

export function formatDuration(totalMinutes: number): string {
  const t = i18n.getFixedT(null, 'common')
  const total = Math.abs(totalMinutes)
  const days = Math.floor(total / 1440)
  const hours = Math.floor((total % 1440) / 60)
  const minutes = total % 60

  const parts: string[] = []
  if (days) parts.push(t('duration.days', { count: days }))
  if (hours) parts.push(t('duration.hours', { count: hours }))
  if (minutes) parts.push(t('duration.minutes', { count: minutes }))
  return parts.join(' ')
}

export function formatOffsetMinutes(offsetMinutes: number): string {
  const t = i18n.getFixedT(null, 'common')
  if (offsetMinutes === 0) return t('duration.atDeadline')

  const total = Math.abs(offsetMinutes)
  const days = Math.floor(total / 1440)
  const hours = Math.floor((total % 1440) / 60)
  const minutes = total % 60

  const parts: string[] = []
  if (days) parts.push(t('duration.days', { count: days }))
  if (hours) parts.push(t('duration.hours', { count: hours }))
  if (minutes) parts.push(t('duration.minutes', { count: minutes }))

  const amount = parts.join(' ')
  return offsetMinutes > 0 ? t('duration.before', { amount }) : t('duration.after', { amount })
}

export function compareByLocale(a: string, b: string, locale = currentLocale()): number {
  return new Intl.Collator(locale, { numeric: true, sensitivity: 'base' }).compare(a, b)
}

export function localeCollator(locale = currentLocale()): Intl.Collator {
  return new Intl.Collator(locale, { numeric: true, sensitivity: 'base' })
}

const EVENT_DAY_PATTERN: Record<Locale, string> = {
  ru: 'EEE, d MMM',
  en: 'EEE, d MMM',
}

const TIME_PATTERN = 'HH:mm'

export function formatEventMoment(
  iso: string | null | undefined,
  base: Date = new Date(),
  locale = currentLocale(),
): string {
  const date = toZoned(iso)
  if (!date) return '—'
  const t = i18n.getFixedT(null, 'common')
  const zonedBase = new TZDate(base, SYSTEM_TIME_ZONE)
  const options = { locale: dateFnsLocale(locale) }
  const time = format(date, TIME_PATTERN, options)

  if (isSameDay(date, zonedBase)) return t('when.today', { time })
  if (isSameDay(date, addDays(zonedBase, 1))) return t('when.tomorrow', { time })
  if (isSameDay(date, addDays(zonedBase, -1))) return t('when.yesterday', { time })

  return `${format(date, EVENT_DAY_PATTERN[locale], options)}, ${time}`
}

export function formatDateRange(
  startIso: string | null | undefined,
  endIso: string | null | undefined,
  locale = currentLocale(),
): string {
  const start = toZoned(startIso)
  const end = toZoned(endIso)
  if (!start) return '—'
  const options = { locale: dateFnsLocale(locale) }
  const startText = format(start, EVENT_DAY_PATTERN[locale], options)
  if (!end || isSameDay(start, end)) return startText
  return `${startText} — ${format(end, EVENT_DAY_PATTERN[locale], options)}`
}
