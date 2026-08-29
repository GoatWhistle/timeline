import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { text } from '@tests/support/dictionaries'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { i18n } from '@/shared/i18n/config'
import { I18nProvider, useTranslation } from '@/shared/i18n/i18n-context'
import { LOCALE_STORAGE_KEY } from '@/shared/i18n/locale'
import { LanguageToggle } from '@/shared/ui/primitives/language-toggle'

function Probe() {
  const { t } = useTranslation()
  return <p data-testid="probe">{t('action.save')}</p>
}

function renderShell() {
  return render(
    <I18nProvider>
      <LanguageToggle />
      <Probe />
    </I18nProvider>,
  )
}

describe('switching the interface language', () => {
  beforeEach(async () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, 'ru')
    await i18n.changeLanguage('ru')
  })

  afterEach(async () => {
    localStorage.removeItem(LOCALE_STORAGE_KEY)
    await i18n.changeLanguage('ru')
  })

  it('renders the stored language on first paint', async () => {
    renderShell()

    await waitFor(() => {
      expect(screen.getByTestId('probe')).toHaveTextContent(text('ru', 'common', 'action.save'))
    })
    expect(document.documentElement.lang).toBe('ru')
  })

  it('retranslates the interface when the other language is picked', async () => {
    const user = userEvent.setup()
    renderShell()

    await waitFor(() => {
      expect(screen.getByTestId('probe')).toHaveTextContent(text('ru', 'common', 'action.save'))
    })

    await user.click(screen.getByRole('radio', { name: text('ru', 'common', 'language.en') }))

    await waitFor(() => {
      expect(screen.getByTestId('probe')).toHaveTextContent(text('en', 'common', 'action.save'))
    })
    expect(i18n.language).toBe('en')
    expect(document.documentElement.lang).toBe('en')
  })

  it('remembers the choice for the next visit', async () => {
    const user = userEvent.setup()
    renderShell()

    await waitFor(() => expect(screen.getByTestId('probe')).toBeInTheDocument())
    await user.click(screen.getByRole('radio', { name: text('ru', 'common', 'language.en') }))

    await waitFor(() => expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('en'))
  })

  it('marks the active language in the toggle', async () => {
    const user = userEvent.setup()
    renderShell()

    await waitFor(() => expect(screen.getByTestId('probe')).toBeInTheDocument())

    const russian = screen.getByRole('radio', { name: text('ru', 'common', 'language.ru') })
    const english = screen.getByRole('radio', { name: text('ru', 'common', 'language.en') })
    expect(russian).toBeChecked()
    expect(english).not.toBeChecked()

    await user.click(english)

    await waitFor(() => expect(english).toBeChecked())
    expect(russian).not.toBeChecked()
  })
})
