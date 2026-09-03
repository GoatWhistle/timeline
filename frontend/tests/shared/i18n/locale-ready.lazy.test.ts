import { afterEach, describe, expect, it } from 'vitest'
import { i18n, i18nReady, localeLoaded, NAMESPACES } from '@/shared/i18n/config'
import { type Locale, resolveLocale } from '@/shared/i18n/locale'

const active: Locale = resolveLocale()

type Bundle = Record<string, unknown>

const removed = new Map<string, Bundle>()

function drop(namespace: string): void {
  const bundle = i18n.getResourceBundle(active, namespace) as Bundle
  removed.set(namespace, bundle)
  i18n.removeResourceBundle(active, namespace)
}

afterEach(() => {
  for (const [namespace, bundle] of removed) {
    i18n.addResourceBundle(active, namespace, bundle, true, true)
  }
  removed.clear()
})

describe('a locale counts as ready only when its words are actually there', () => {
  it('is ready once every namespace has arrived', async () => {
    await i18nReady
    expect(localeLoaded(active)).toBe(true)
  })

  it.each([...NAMESPACES])('is not ready while the %s namespace is missing', async (namespace) => {
    await i18nReady
    expect(localeLoaded(active)).toBe(true)

    drop(namespace)

    expect(i18n.isInitialized).toBe(true)
    expect(i18n.hasResourceBundle(active, namespace)).toBe(false)
    expect(localeLoaded(active)).toBe(false)
  })

  it('is not ready while every namespace is missing, even though i18n is initialised', async () => {
    await i18nReady
    for (const namespace of NAMESPACES) drop(namespace)

    expect(i18n.isInitialized).toBe(true)
    expect(localeLoaded(active)).toBe(false)
  })

  it('becomes ready again once the namespaces are put back', async () => {
    await i18nReady
    for (const namespace of NAMESPACES) drop(namespace)
    expect(localeLoaded(active)).toBe(false)

    for (const [namespace, bundle] of removed) {
      i18n.addResourceBundle(active, namespace, bundle, true, true)
    }
    removed.clear()

    expect(localeLoaded(active)).toBe(true)
  })
})
