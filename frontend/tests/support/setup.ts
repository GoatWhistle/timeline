import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeAll } from 'vitest'
import { i18nReady, loadLocale } from '@/shared/i18n/config'
import { LOCALES } from '@/shared/i18n/locale'

beforeAll(async () => {
  await i18nReady
  await Promise.all(LOCALES.map((locale) => loadLocale(locale)))
})

if (!('ResizeObserver' in globalThis)) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

afterEach(cleanup)
