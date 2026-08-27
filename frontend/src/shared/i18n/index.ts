import enErrors from './locales/en/errors.json'
import ruErrors from './locales/ru/errors.json'

export type Locale = 'ru' | 'en'

export const DEFAULT_LOCALE: Locale = 'ru'

const errorCatalogs: Record<Locale, Record<string, string>> = {
  en: enErrors,
  ru: ruErrors,
}

export function errorMessage(code: string, locale: Locale = DEFAULT_LOCALE): string | undefined {
  return errorCatalogs[locale][code] ?? errorCatalogs[DEFAULT_LOCALE][code]
}

export function errorCodes(locale: Locale = DEFAULT_LOCALE): string[] {
  return Object.keys(errorCatalogs[locale])
}
