import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { LanguageChoice } from '@/features/appearance/language-choice'
import { i18n } from '@/shared/i18n/config'
import { I18nProvider } from '@/shared/i18n/i18n-context'

function renderChoice() {
  return render(
    <I18nProvider>
      <LanguageChoice />
    </I18nProvider>,
  )
}

function flagOf(locale: string): HTMLImageElement | null {
  return document.querySelector<HTMLImageElement>(`img[data-flag="${locale}"]`)
}

describe('the flag a language is offered under', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('ru')
  })

  it('offers English under the British flag and never the American one', () => {
    renderChoice()
    const flag = flagOf('en')

    expect(flag, 'the English option carries a flag').not.toBeNull()
    expect(flag?.getAttribute('data-flag-country')).toBe('gb')
    expect(flag?.getAttribute('src')).toBe('/flags/gb.svg')
    expect(flag?.getAttribute('src')).not.toBe('/flags/us.svg')
    expect(flag?.getAttribute('data-flag-country')).not.toBe('us')
  })

  it('offers Russian under the Russian flag', () => {
    renderChoice()
    const flag = flagOf('ru')

    expect(flag?.getAttribute('data-flag-country')).toBe('ru')
    expect(flag?.getAttribute('src')).toBe('/flags/ru.svg')
  })

  it('gives the two languages two different flags', () => {
    renderChoice()

    const en = flagOf('en')?.getAttribute('src')
    const ru = flagOf('ru')?.getAttribute('src')

    expect(en).toBeTruthy()
    expect(ru).toBeTruthy()
    expect(en, 'each language must be told apart by its own flag').not.toBe(ru)
  })

  it('draws every flag from the vendored set, never from hand-drawn contours', () => {
    renderChoice()

    for (const locale of ['ru', 'en']) {
      const flag = flagOf(locale)
      expect(flag?.tagName.toLowerCase(), locale).toBe('img')
      expect(flag?.getAttribute('src'), locale).toMatch(/^\/flags\/[a-z]{2}\.svg$/)
    }
    expect(document.querySelectorAll('svg[data-flag]')).toHaveLength(0)
  })
})
