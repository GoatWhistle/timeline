import { render, screen } from '@testing-library/react'
import { text } from '@tests/support/dictionaries'
import { renderWithProviders } from '@tests/support/render'
import { beforeEach, describe, expect, it } from 'vitest'
import { LanguageChoice } from '@/features/appearance/language-choice'
import { ThemeChoice } from '@/features/appearance/theme-choice'
import { i18n } from '@/shared/i18n/config'
import { I18nProvider } from '@/shared/i18n/i18n-context'
import { LOCALES } from '@/shared/i18n/locale'

function renderChoice() {
  return render(
    <I18nProvider>
      <LanguageChoice />
    </I18nProvider>,
  )
}

function flagOf(locale: string): SVGElement | null {
  return document.querySelector<SVGElement>(`[data-flag="${locale}"]`)
}

describe('the language picker carries a flag beside every name', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('ru')
  })

  it('draws one flag per language', () => {
    renderChoice()
    for (const locale of LOCALES) {
      expect(flagOf(locale), locale).not.toBeNull()
    }
    expect(document.querySelectorAll('[data-flag]')).toHaveLength(LOCALES.length)
  })

  it('hides every flag from a screen reader', () => {
    renderChoice()
    for (const locale of LOCALES) {
      expect(flagOf(locale)?.getAttribute('aria-hidden'), locale).toBe('true')
      expect(flagOf(locale)?.getAttribute('focusable'), locale).toBe('false')
    }
  })

  it('keeps the name of the language, so the flag is never the only signal', () => {
    renderChoice()
    for (const locale of LOCALES) {
      const name = text('ru', 'common', `language.${locale}`)
      expect(screen.getByText(name), locale).toBeInTheDocument()
      expect(screen.getByRole('radio', { name }), locale).toBeInTheDocument()
    }
  })

  it('announces the language and not the country', () => {
    renderChoice()
    for (const locale of LOCALES) {
      const option = document.querySelector<HTMLElement>(`[data-language-option="${locale}"]`)
      expect(option?.textContent).toBe(text('ru', 'common', `language.${locale}`))
    }
  })
})

describe('the theme picker stays free of flags, since a theme has no country', () => {
  it('draws no flag on any theme card', () => {
    renderWithProviders(<ThemeChoice />)
    expect(document.querySelectorAll('[data-theme-option]').length).toBeGreaterThan(0)
    expect(document.querySelectorAll('[data-flag]')).toHaveLength(0)
  })
})
