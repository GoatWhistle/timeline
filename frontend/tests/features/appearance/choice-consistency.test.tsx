import { render } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EventKindChoice } from '@/entities/event/event-taxonomy-fields'
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
  return [...option.querySelectorAll('[data-option-mark="on"]')].length
}

const GROUPS = [
  {
    name: 'language',
    attribute: 'data-language-option',
    mount: () =>
      render(
        <I18nProvider>
          <LanguageChoice />
        </I18nProvider>,
      ),
  },
  {
    name: 'theme',
    attribute: 'data-theme-option',
    mount: () => renderWithProviders(<ThemeChoice />),
  },
  {
    name: 'event kind',
    attribute: 'data-kind-option',
    mount: () => renderWithProviders(<EventKindChoice value="MEETUP" onChange={vi.fn()} />),
  },
] as const

describe('every group of picture-and-label choices is built the same way', () => {
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

  it.each(GROUPS)('$name marks the chosen option with something that is not a colour', (group) => {
    group.mount()
    expect(markCount(selectedOption(group.attribute))).toBe(1)
  })

  it.each(GROUPS)('$name leaves every unchosen option unmarked', (group) => {
    group.mount()
    const unselected = [...document.querySelectorAll<HTMLElement>(`[${group.attribute}]`)].filter(
      (node) => node.dataset.selected !== 'true',
    )
    expect(unselected.length).toBeGreaterThan(0)
    for (const option of unselected) expect(markCount(option)).toBe(0)
  })

  it.each(GROUPS)('$name never leaves the border colour as the only signal', (group) => {
    group.mount()
    const chosen = selectedOption(group.attribute)
    expect(chosen.className).toContain('border-primary')
    expect(markCount(chosen)).toBeGreaterThan(0)
  })

  it.each(GROUPS)('$name eases the selected look in with a property that exists', (group) => {
    group.mount()
    const chosen = selectedOption(group.attribute)
    const eased = chosen.className.match(/(?:motion-safe:)?transition-\[([^\]]+)\]/)?.[1]
    expect(eased, `${group.name} declares no transition property list`).toBeDefined()

    const CSS_PROPERTIES = new Set([
      'color',
      'background-color',
      'border-color',
      'box-shadow',
      'opacity',
      'transform',
      'outline-color',
      'text-decoration-color',
      'fill',
      'stroke',
    ])
    for (const property of (eased ?? '').split(',')) {
      expect(
        CSS_PROPERTIES,
        `${group.name} eases "${property}", which is not a CSS property and so never animates`,
      ).toContain(property.trim())
    }
  })

  it.each(GROUPS)('$name is drawn on the one shared option chassis', (group) => {
    group.mount()
    const options = [...document.querySelectorAll<HTMLElement>(`[${group.attribute}]`)]
    expect(options.length).toBeGreaterThan(0)
    for (const option of options) {
      expect(option.hasAttribute('data-option-card')).toBe(true)
      expect(option.tagName).toBe('LABEL')
      expect(option.querySelector('input[type="radio"].sr-only')).not.toBeNull()
      expect(option.className).toContain('rounded-surface')
    }
  })
})
