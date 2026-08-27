import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { Route, Routes } from 'react-router'
import { describe, expect, it } from 'vitest'
import { LoginPage } from '@/features/auth/login/login'
import { MOCK_PASSWORD } from '@/mocks/fixtures'
import { i18n } from '@/shared/i18n/config'

function Harness() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<h1>My events</h1>} />
    </Routes>
  )
}

describe('LoginPage', () => {
  it('signs in with valid credentials', async () => {
    const { user } = renderWithProviders(<Harness />, { route: '/login' })

    await user.type(screen.getByLabelText('Email'), 'user@example.com')
    await user.type(screen.getByLabelText(i18n.t('auth:field.password')), MOCK_PASSWORD)
    await user.click(screen.getByRole('button', { name: i18n.t('auth:login.submit') }))

    expect(await screen.findByRole('heading', { name: 'My events' })).toBeInTheDocument()
  })

  it('shows the server error for a wrong password', async () => {
    const { user } = renderWithProviders(<Harness />, { route: '/login' })

    await user.type(screen.getByLabelText('Email'), 'user@example.com')
    await user.type(screen.getByLabelText(i18n.t('auth:field.password')), 'wrong-password')
    await user.click(screen.getByRole('button', { name: i18n.t('auth:login.submit') }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Неверный email или пароль')
    expect(screen.queryByRole('heading', { name: 'My events' })).not.toBeInTheDocument()
  })

  it('toggles password visibility back and forth', async () => {
    const { user } = renderWithProviders(<Harness />, { route: '/login' })

    const password = screen.getByLabelText(i18n.t('auth:field.password'))
    await user.type(password, MOCK_PASSWORD)
    expect(password).toHaveAttribute('type', 'password')

    const toggle = screen.getByRole('button', { name: i18n.t('common:password.show') })
    expect(toggle).toHaveAttribute('aria-pressed', 'false')

    await user.click(toggle)
    expect(screen.getByLabelText(i18n.t('auth:field.password'))).toHaveAttribute('type', 'text')
    expect(screen.getByRole('button', { name: i18n.t('common:password.hide') })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    await user.click(screen.getByRole('button', { name: i18n.t('common:password.hide') }))
    expect(screen.getByLabelText(i18n.t('auth:field.password'))).toHaveAttribute('type', 'password')
  })

  it('does not submit the form from the visibility toggle', async () => {
    const { user } = renderWithProviders(<Harness />, { route: '/login' })

    await user.type(screen.getByLabelText('Email'), 'user@example.com')
    await user.type(screen.getByLabelText(i18n.t('auth:field.password')), MOCK_PASSWORD)
    await user.click(screen.getByRole('button', { name: i18n.t('common:password.show') }))

    expect(screen.queryByRole('heading', { name: 'My events' })).not.toBeInTheDocument()
  })

  it('quick sign-in fills the demo account', async () => {
    const { user } = renderWithProviders(<Harness />, { route: '/login' })

    await user.click(screen.getByRole('button', { name: i18n.t('auth:login.roleUser') }))
    expect(screen.getByLabelText('Email')).toHaveValue('user@example.com')

    await user.click(screen.getByRole('button', { name: i18n.t('auth:login.submit') }))
    expect(await screen.findByRole('heading', { name: 'My events' })).toBeInTheDocument()
  })

  it('does not submit the form with a malformed email', async () => {
    const { user } = renderWithProviders(<Harness />, { route: '/login' })

    await user.type(screen.getByLabelText('Email'), 'не-email')
    await user.type(screen.getByLabelText(i18n.t('auth:field.password')), MOCK_PASSWORD)
    await user.click(screen.getByRole('button', { name: i18n.t('auth:login.submit') }))

    expect(await screen.findByText(i18n.t('auth:validation.email'))).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')
    })
  })
})
