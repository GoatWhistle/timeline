import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { text } from '@tests/support/dictionaries'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { LanguageChoice } from '@/features/appearance/language-choice'
import { i18n } from '@/shared/i18n/config'
import { I18nProvider, useTranslation } from '@/shared/i18n/i18n-context'
import { LOCALE_STORAGE_KEY } from '@/shared/i18n/locale'

function Probe() {
  const { t } = useTranslation()
  return <p data-testid="probe">{t('action.save')}</p>
}

function renderChoice() {
  return render(
    <I18nProvider>
      <LanguageChoice />
      <Probe />
    </I18nProvider>,
  )
}

describe('choosing the interface language', () => {
  beforeEach(async () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, 'ru')
    await i18n.changeLanguage('ru')
  })

  afterEach(async () => {
    localStorage.removeItem(LOCALE_STORAGE_KEY)
    await i18n.changeLanguage('ru')
  })

  it('offers every supported language with a flag beside its name', async () => {
    renderChoice()
    await waitFor(() => expect(screen.getByTestId('probe')).toBeInTheDocument())

    expect(screen.getAllByRole('radio')).toHaveLength(2)
    for (const value of ['ru', 'en']) {
      const option = document.querySelector(`[data-language-option="${value}"]`)
      expect(option).not.toBeNull()
      expect(option?.textContent?.trim().length).toBeGreaterThan(0)
    }
  })

  it('retranslates the interface the moment the other language is picked', async () => {
    const user = userEvent.setup()
    renderChoice()

    await waitFor(() => {
      expect(screen.getByTestId('probe')).toHaveTextContent(text('ru', 'common', 'action.save'))
    })

    await user.click(screen.getByRole('radio', { name: text('ru', 'common', 'language.en') }))

    await waitFor(() => {
      expect(screen.getByTestId('probe')).toHaveTextContent(text('en', 'common', 'action.save'))
    })
    expect(document.documentElement.lang).toBe('en')
  })

  it('keeps the choice for the next visit', async () => {
    const user = userEvent.setup()
    renderChoice()

    await waitFor(() => expect(screen.getByTestId('probe')).toBeInTheDocument())
    await user.click(screen.getByRole('radio', { name: text('ru', 'common', 'language.en') }))

    await waitFor(() => expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('en'))
  })

  it('marks exactly the active language', async () => {
    const user = userEvent.setup()
    renderChoice()

    await waitFor(() => expect(screen.getByTestId('probe')).toBeInTheDocument())

    const russian = screen.getByRole('radio', { name: text('ru', 'common', 'language.ru') })
    const english = screen.getByRole('radio', { name: text('ru', 'common', 'language.en') })
    expect(russian).toBeChecked()
    expect(english).not.toBeChecked()

    await user.click(english)

    await waitFor(() => expect(english).toBeChecked())
    expect(russian).not.toBeChecked()
    expect(
      document.querySelector('[data-language-option="en"]')?.getAttribute('data-selected'),
    ).toBe('true')
  })
})
