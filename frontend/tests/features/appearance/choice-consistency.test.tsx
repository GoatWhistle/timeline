import { render } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LanguageChoice } from '@/features/appearance/language-choice'
import { ThemeChoice } from '@/features/appearance/theme-choice'
import { I18nProvider } from '@/shared/i18n/i18n-context'
import { THEME_STORAGE_KEY } from '@/shared/theme/theme'

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

function selectedOption(attribute: string): HTMLElement {
  const node = document.querySelector<HTMLElement>(`[${attribute}][data-selected="true"]`)
  if (!node) throw new Error(`no selected option carrying ${attribute}`)
  return node
}

function markCount(option: HTMLElement): number {
  return [...option.querySelectorAll('svg')].filter((icon) =>
    (icon.getAttribute('class') ?? '').includes('opacity-100'),
  ).length
}

describe('the two choice groups on the appearance page agree', () => {
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

  it('marks the chosen language with something that is not a colour', () => {
    render(
      <I18nProvider>
        <LanguageChoice />
      </I18nProvider>,
    )

    expect(markCount(selectedOption('data-language-option'))).toBe(1)
  })

  it('marks the chosen theme with something that is not a colour', () => {
    renderWithProviders(<ThemeChoice />)

    expect(markCount(selectedOption('data-theme-option'))).toBe(1)
  })

  it('leaves the unchosen theme cards unmarked', () => {
    renderWithProviders(<ThemeChoice />)

    const unselected = [...document.querySelectorAll<HTMLElement>('[data-theme-option]')].filter(
      (node) => node.dataset.selected !== 'true',
    )
    expect(unselected).toHaveLength(2)
    for (const option of unselected) expect(markCount(option)).toBe(0)
  })

  it('never leaves the selected border colour as the only signal', () => {
    renderWithProviders(<ThemeChoice />)

    const chosen = selectedOption('data-theme-option')
    expect(chosen.className).toContain('border-primary')
    expect(markCount(chosen)).toBeGreaterThan(0)
  })
})
