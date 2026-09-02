import { screen, waitFor } from '@testing-library/react'
import { text } from '@tests/support/dictionaries'
import { renderWithProviders } from '@tests/support/render'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ThemeChoice } from '@/features/appearance/theme-choice'
import { i18n } from '@/shared/i18n/config'
import { LOCALES } from '@/shared/i18n/locale'
import { THEME_STORAGE_KEY } from '@/shared/theme/theme'

const darkLabel = () => text(i18n.language === 'en' ? 'en' : 'ru', 'common', 'theme.dark')

function matchMediaReturning(dark: boolean) {
  return vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('prefers-color-scheme: dark') ? dark : false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

describe('choosing a theme shows what is being chosen', () => {
  beforeEach(() => {
    localStorage.removeItem(THEME_STORAGE_KEY)
    document.documentElement.classList.remove('dark')
    vi.stubGlobal('matchMedia', matchMediaReturning(false))
  })

  afterEach(() => {
    localStorage.removeItem(THEME_STORAGE_KEY)
    document.documentElement.classList.remove('dark')
    vi.unstubAllGlobals()
  })

  it('offers light, dark and a system option', () => {
    renderWithProviders(<ThemeChoice />)

    expect(screen.getAllByRole('radio')).toHaveLength(3)
    for (const value of ['light', 'dark', 'system']) {
      expect(document.querySelector(`[data-theme-option="${value}"]`)).not.toBeNull()
    }
  })

  it('previews each theme instead of naming it in words alone', () => {
    renderWithProviders(<ThemeChoice />)

    const light = document.querySelector('[data-theme-option="light"] [data-theme-preview]')
    const dark = document.querySelector('[data-theme-option="dark"] [data-theme-preview]')
    expect(light?.getAttribute('data-theme-preview')).toBe('light')
    expect(dark?.getAttribute('data-theme-preview')).toBe('dark')
    expect(dark?.classList.contains('dark')).toBe(true)
    expect(light?.classList.contains('dark')).toBe(false)
    expect(light?.classList.contains('light')).toBe(true)
  })

  it('keeps a light preview light while the app itself is dark', async () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark')
    renderWithProviders(<ThemeChoice />)

    await waitFor(() => expect(document.documentElement.classList.contains('dark')).toBe(true))

    const light = document.querySelector('[data-theme-option="light"] [data-theme-preview]')
    expect(light?.classList.contains('light')).toBe(true)
    expect(light?.classList.contains('dark')).toBe(false)
  })

  it('shows both themes inside the one system card, split by a divider', () => {
    renderWithProviders(<ThemeChoice />)

    const card = document.querySelector('[data-theme-option="system"]')
    const split = card?.querySelector('[data-theme-preview="system"]')
    expect(split).not.toBeNull()

    const light = split?.querySelector('[data-theme-preview-half="light"]')
    const dark = split?.querySelector('[data-theme-preview-half="dark"]')
    expect(light?.classList.contains('light')).toBe(true)
    expect(light?.classList.contains('dark')).toBe(false)
    expect(dark?.classList.contains('dark')).toBe(true)
    expect(split?.querySelector('[data-theme-preview-divider]')).not.toBeNull()
  })

  it('never explains the obvious in words', () => {
    renderWithProviders(<ThemeChoice />)

    const copy = document.body.textContent ?? ''
    expect(copy).not.toMatch(/showing now/i)
    expect(copy).not.toMatch(/follow the system setting/i)
    expect(document.querySelector('[data-theme-resolved]')).toBeNull()
  })

  it('labels each card with one word and never repeats "Theme"', () => {
    renderWithProviders(<ThemeChoice />)

    const locale = i18n.language === 'en' ? 'en' : 'ru'
    for (const value of ['light', 'dark', 'system']) {
      const shown = document
        .querySelector(`[data-theme-option="${value}"] span span`)
        ?.textContent?.trim()
      expect(shown).toBe(text(locale, 'common', `theme.${value}`))
    }
  })

  it('states every theme in one word, in every language', () => {
    for (const each of LOCALES) {
      const heading = text(each, 'common', 'settings.theme')
      for (const value of ['light', 'dark', 'system']) {
        const label = text(each, 'common', `theme.${value}`)
        expect(label, `${each}/${value} repeats the section heading`).not.toMatch(
          new RegExp(heading, 'i'),
        )
        expect(label.split(' '), `${each}/${value} is not a single word`).toHaveLength(1)
      }
    }
  })

  it('applies the pick to the document at once and remembers it', async () => {
    const { user } = renderWithProviders(<ThemeChoice />)

    await user.click(screen.getByRole('radio', { name: darkLabel() }))

    await waitFor(() => expect(document.documentElement.classList.contains('dark')).toBe(true))
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
  })

  it('gates every preview movement behind motion-safe', () => {
    renderWithProviders(<ThemeChoice />)

    for (const node of document.querySelectorAll('[data-theme-preview]')) {
      for (const name of node.classList) {
        if (name.includes('scale-') || name.includes('transition-transform')) {
          expect(name.startsWith('motion-safe:')).toBe(true)
        }
      }
    }
  })
})
