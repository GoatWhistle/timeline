import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import i18n from 'i18next'
import { afterEach, beforeAll } from 'vitest'
import { i18nReady, loadLocale } from '@/shared/i18n/config'
import { LOCALES } from '@/shared/i18n/locale'

const TEST_LOCALE = 'en'

beforeAll(async () => {
  await i18nReady
  await Promise.all(LOCALES.map((locale) => loadLocale(locale)))
  await i18n.changeLanguage(TEST_LOCALE)
})

if (!('ResizeObserver' in globalThis)) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function scrollIntoView() {}
}

if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false
}

if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = () => {}
}

if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = () => {}
}

afterEach(cleanup)
