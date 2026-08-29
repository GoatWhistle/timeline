import { i18n } from './config'
import { DEFAULT_LOCALE, type Locale, toLocale } from './locale'

export function errorMessage(
  code: string,
  locale: Locale = toLocale(i18n.language),
): string | undefined {
  const direct = i18n.getResource(locale, 'errors', code)
  if (typeof direct === 'string') return direct
  const fallback = i18n.getResource(DEFAULT_LOCALE, 'errors', code)
  return typeof fallback === 'string' ? fallback : undefined
}
