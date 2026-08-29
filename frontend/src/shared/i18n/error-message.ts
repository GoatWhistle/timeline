import { i18n } from './config'
import { DEFAULT_LOCALE, type Locale } from './locale'
import enErrors from './locales/en/errors.json'
import ruErrors from './locales/ru/errors.json'

const errorCatalogs: Record<Locale, Record<string, string>> = {
  en: enErrors,
  ru: ruErrors,
}

function activeLocale(): Locale {
  const language = i18n.language?.split('-')[0]
  return language === 'en' || language === 'ru' ? language : DEFAULT_LOCALE
}

export function errorMessage(code: string, locale: Locale = activeLocale()): string | undefined {
  return errorCatalogs[locale][code] ?? errorCatalogs[DEFAULT_LOCALE][code]
}
