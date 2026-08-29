import { beforeAll, describe, expect, it } from 'vitest'
import { ensureLocale, i18n, i18nReady, NAMESPACES } from '@/shared/i18n/config'
import { LOCALES, type Locale, resolveLocale } from '@/shared/i18n/locale'

const activeLocale: Locale = resolveLocale()
const otherLocales: Locale[] = LOCALES.filter((locale) => locale !== activeLocale)

function loadedNamespaces(locale: Locale): string[] {
  return NAMESPACES.filter((namespace) => i18n.hasResourceBundle(locale, namespace)).sort()
}

const everyNamespace = [...NAMESPACES].sort()

describe('lazy locale loading', () => {
  beforeAll(async () => {
    await i18nReady
  })

  it('has another locale to be lazy about', () => {
    expect(otherLocales.length).toBeGreaterThan(0)
  })

  it('starts on the locale the environment resolves to', () => {
    expect(i18n.language).toBe(activeLocale)
  })

  it('loads every namespace of the active locale on start', () => {
    expect(loadedNamespaces(activeLocale)).toEqual(everyNamespace)
  })

  it('translates in the active locale straight away', () => {
    expect(i18n.getFixedT(activeLocale, 'common')('action.save')).not.toBe('action.save')
  })

  it('loads no namespace of any other locale on start', () => {
    for (const locale of otherLocales) {
      expect(loadedNamespaces(locale), locale).toEqual([])
    }
  })

  it('pulls another locale in only once ensureLocale asks for it', async () => {
    for (const locale of otherLocales) {
      expect(loadedNamespaces(locale), locale).toEqual([])

      await ensureLocale(locale)

      expect(loadedNamespaces(locale), locale).toEqual(everyNamespace)
      expect(i18n.getFixedT(locale, 'common')('action.save')).not.toBe('action.save')
    }
  })
})
