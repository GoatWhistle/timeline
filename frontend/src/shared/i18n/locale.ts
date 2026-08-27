export const LOCALES = ['ru', 'en'] as const

export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'ru'

export const LOCALE_STORAGE_KEY = 'timeline-locale'

export function isLocale(value: unknown): value is Locale {
  return LOCALES.includes(value as Locale)
}

export function readStoredLocale(): Locale | null {
  try {
    const raw = localStorage.getItem(LOCALE_STORAGE_KEY)
    return isLocale(raw) ? raw : null
  } catch {
    return null
  }
}

export function writeStoredLocale(locale: Locale): void {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale)
  } catch {
    return
  }
}

export function navigatorLocale(): Locale | null {
  if (typeof navigator === 'undefined') return null
  for (const tag of navigator.languages ?? [navigator.language]) {
    const base = tag?.split('-')[0]
    if (isLocale(base)) return base
  }
  return null
}

export function resolveLocale(profileLocale?: string | null): Locale {
  if (isLocale(profileLocale)) return profileLocale
  return readStoredLocale() ?? navigatorLocale() ?? DEFAULT_LOCALE
}

export function toLocale(language: string | undefined): Locale {
  const base = language?.split('-')[0]
  return isLocale(base) ? base : DEFAULT_LOCALE
}
