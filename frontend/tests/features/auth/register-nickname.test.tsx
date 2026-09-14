import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it } from 'vitest'
import { RegisterPage } from '@/features/auth/register/register'
import { nicknameProblem } from '@/shared/forms/nickname'
import { i18n } from '@/shared/i18n/config'

function nicknameField(): HTMLInputElement {
  return screen.getByLabelText(new RegExp(i18n.t('auth:field.nickname'))) as HTMLInputElement
}

describe('the registration form asks for a nickname', () => {
  it('offers the field and marks it required', () => {
    renderWithProviders(<RegisterPage />)
    const field = nicknameField()
    expect(field).toBeInTheDocument()
    expect(field.id).toBe('nickname')
  })

  it('marks it required the same way the other required fields are marked', () => {
    renderWithProviders(<RegisterPage />)
    const label = document.querySelector('label[for="nickname"]')
    const emailLabel = document.querySelector('label[for="email"]')
    expect(label?.querySelector('[aria-hidden="true"]')?.textContent).toBe('*')
    expect(emailLabel?.querySelector('[aria-hidden="true"]')?.textContent).toBe('*')
  })

  it('refuses to submit an empty nickname', async () => {
    const { user } = renderWithProviders(<RegisterPage />)
    await user.click(screen.getByRole('button', { name: i18n.t('auth:register.submit') }))

    const messages = await screen.findAllByRole('alert')
    const texts = messages.map((node) => node.textContent)
    expect(texts).toContain(i18n.t('auth:validation.nicknameRequired'))
  })

  it('reports only the rule the typed nickname broke', async () => {
    const { user } = renderWithProviders(<RegisterPage />)
    await user.type(nicknameField(), 'ab')
    await user.click(screen.getByRole('button', { name: i18n.t('auth:register.submit') }))

    const messages = await screen.findAllByRole('alert')
    const texts = messages.map((node) => node.textContent)
    expect(texts).toContain(i18n.t('auth:validation.nicknameMin'))
    expect(texts).not.toContain(i18n.t('auth:validation.nicknameChars'))
  })

  it('offers no profile visibility switch, because that is decided later', () => {
    renderWithProviders(<RegisterPage />)
    expect(screen.queryByRole('switch')).toBeNull()
  })
})

describe('the nickname rules are shared, not respelled per form', () => {
  it('shares one rule set with the registration form and the profile card', () => {
    expect(nicknameProblem('ab')).toBe('auth:validation.nicknameMin')
    expect(nicknameProblem('my-handle-')).toBe('auth:validation.nicknameEdges')
    expect(nicknameProblem('ivan')).toBeNull()
  })
})
