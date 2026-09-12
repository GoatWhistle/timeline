import { screen, waitFor } from '@testing-library/react'
import { text } from '@tests/support/dictionaries'
import { renderWithProviders } from '@tests/support/render'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { AuthLanguageSwitch } from '@/features/auth/door/auth-language-switch'
import { i18n } from '@/shared/i18n/config'
import { I18nProvider } from '@/shared/i18n/i18n-context'
import { LOCALE_STORAGE_KEY } from '@/shared/i18n/locale'

function renderSwitch() {
  return renderWithProviders(
    <I18nProvider>
      <AuthLanguageSwitch />
    </I18nProvider>,
  )
}

beforeEach(async () => {
  localStorage.setItem(LOCALE_STORAGE_KEY, 'ru')
  await i18n.changeLanguage('ru')
})

afterEach(async () => {
  localStorage.removeItem(LOCALE_STORAGE_KEY)
  await i18n.changeLanguage('ru')
})

describe('the auth door language switch', () => {
  it('is a globe button, closed until opened', () => {
    renderSwitch()
    expect(
      screen.getByRole('button', { name: text('ru', 'common', 'language.label') }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('navigation', { name: text('ru', 'common', 'language.legend') }),
    ).not.toBeInTheDocument()
  })

  it('opens a menu with both languages, flags included', async () => {
    const { user } = renderSwitch()
    await user.click(screen.getByRole('button', { name: text('ru', 'common', 'language.label') }))

    const nav = await screen.findByRole('navigation', {
      name: text('ru', 'common', 'language.legend'),
    })
    const options = nav.querySelectorAll('button[data-indicator-item]')
    expect(options).toHaveLength(2)
    expect(nav.querySelectorAll('svg[data-flag]')).toHaveLength(2)
  })

  it('marks the active language and switches the interface on pick', async () => {
    const { user } = renderSwitch()
    await user.click(screen.getByRole('button', { name: text('ru', 'common', 'language.label') }))

    const russian = await screen.findByRole('button', {
      name: new RegExp(text('ru', 'common', 'language.ru')),
    })
    const english = screen.getByRole('button', {
      name: new RegExp(text('ru', 'common', 'language.en')),
    })
    expect(russian).toHaveAttribute('aria-current', 'true')
    expect(english).not.toHaveAttribute('aria-current')

    await user.click(english)

    await waitFor(() => expect(document.documentElement.lang).toBe('en'))
    await waitFor(() => expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('en'))
  })

  it('highlights the active language with the shared sliding indicator, no separate checkmark', async () => {
    const { user } = renderSwitch()
    await user.click(screen.getByRole('button', { name: text('ru', 'common', 'language.label') }))

    const nav = await screen.findByRole('navigation', {
      name: text('ru', 'common', 'language.legend'),
    })
    expect(nav.querySelector('[data-indicator]')).not.toBeNull()

    const russian = screen.getByRole('button', {
      name: new RegExp(text('ru', 'common', 'language.ru')),
    })
    expect(russian).toHaveAttribute('data-indicator-active', 'true')
    expect(nav.querySelectorAll('svg.lucide-check')).toHaveLength(0)
  })
})
