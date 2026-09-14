import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it } from 'vitest'
import { LanguageChoice } from '@/features/appearance/language-choice'
import { ThemeChoice } from '@/features/appearance/theme-choice'
import { I18nProvider } from '@/shared/i18n/i18n-context'

const SRC = join(process.cwd(), 'src')

const THEME = join(SRC, 'features/appearance/theme-choice.tsx')
const LANGUAGE = join(SRC, 'features/appearance/language-choice.tsx')

describe('a choice of theme or language spells its options out, phone included', () => {
  it('stacks the options one per row before there is room for a grid', () => {
    for (const file of [THEME, LANGUAGE]) {
      const source = readFileSync(file, 'utf8')
      expect(source, file).toContain('grid-cols-1')
      expect(
        source,
        `${file} widens to a grid on a viewport breakpoint or on its own container`,
      ).toMatch(/(sm:grid-cols-[23]|@\[[\d.]+rem\]:grid-cols-[23])/)
    }
  })

  it('truncates neither label, since a stacked row has the width to show it whole', () => {
    for (const file of [THEME, LANGUAGE]) {
      const source = readFileSync(file, 'utf8')
      const labels = source.slice(source.indexOf('<fieldset'))
      expect(labels, file).not.toContain('truncate')
    }
  })

  it('still offers every theme and every language by its full name', async () => {
    const theme = await renderWithProviders(
      <I18nProvider>
        <ThemeChoice />
      </I18nProvider>,
    )
    for (const option of ['light', 'dark', 'system']) {
      expect(theme.container.querySelector(`[data-theme-option="${option}"]`)).not.toBeNull()
    }

    const language = await renderWithProviders(
      <I18nProvider>
        <LanguageChoice />
      </I18nProvider>,
    )
    for (const option of ['ru', 'en']) {
      expect(language.container.querySelector(`[data-language-option="${option}"]`)).not.toBeNull()
    }
  })

  it('keeps the theme preview from squeezing the label out of a stacked row', () => {
    const source = readFileSync(THEME, 'utf8')
    expect(source).toContain('shrink-0')
    expect(source).toMatch(/sm:w-full/)
  })
})
