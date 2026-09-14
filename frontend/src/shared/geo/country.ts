import { i18n } from '@/shared/i18n/config'
import { DEFAULT_LOCALE, isLocale, type Locale } from '@/shared/i18n/locale'

const CODE_PATTERN = /^[A-Za-z]{2}$/

const resolvers = new Map<Locale, Intl.DisplayNames | null>()

function currentLocale(): Locale {
  const language = i18n.language?.split('-')[0]
  return isLocale(language) ? language : DEFAULT_LOCALE
}

function regionNames(locale: Locale): Intl.DisplayNames | null {
  const cached = resolvers.get(locale)
  if (cached !== undefined) return cached
  let created: Intl.DisplayNames | null = null
  try {
    created = new Intl.DisplayNames([locale], { type: 'region' })
  } catch {
    created = null
  }
  resolvers.set(locale, created)
  return created
}

export function countryName(code: string | null | undefined): string | null {
  if (!code || !CODE_PATTERN.test(code)) return null
  const upper = code.toUpperCase()
  const resolver = regionNames(currentLocale())
  if (!resolver) return upper
  try {
    const resolved = resolver.of(upper)
    return resolved && resolved !== upper ? resolved : upper
  } catch {
    return upper
  }
}

export function placeLine(
  city: string | null | undefined,
  countryCode: string | null | undefined,
): string | null {
  const trimmedCity = city?.trim() || null
  const country = countryName(countryCode)
  const parts = [trimmedCity, country].filter((part): part is string => part !== null)
  return parts.length === 0 ? null : parts.join(', ')
}
