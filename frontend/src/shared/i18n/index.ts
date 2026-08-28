import { i18n } from './config'
import { DEFAULT_LOCALE, type Locale } from './locale'
import enErrors from './locales/en/errors.json'
import ruErrors from './locales/ru/errors.json'

export { i18n } from './config'
export { I18nProvider, useLocale, useTranslation } from './i18n-context'
export { DEFAULT_LOCALE, isLocale, LOCALES, type Locale, resolveLocale } from './locale'
export { useProfileLocale } from './use-profile-locale'

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

export function errorCodes(locale: Locale = DEFAULT_LOCALE): string[] {
  return Object.keys(errorCatalogs[locale])
}
