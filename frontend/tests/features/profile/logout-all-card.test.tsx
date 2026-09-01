import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { LogoutAllCard } from '@/features/profile/account-actions-card/account-actions-card'
import { i18n } from '@/shared/i18n/config'

const logoutAll = vi.fn()

vi.mock('@/entities/user/profile.queries', () => ({
  useLogoutAllSessions: () => ({ mutateAsync: logoutAll, isPending: false }),
  useDeactivateAccount: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

beforeAll(async () => {
  await i18n.changeLanguage('en')
})

describe('sign out everywhere', () => {
  it('reads as destructive, the way the danger zone does', () => {
    const { container } = renderWithProviders(<LogoutAllCard />)

    const card = container.querySelector('.border-destructive\\/40')
    expect(card).not.toBeNull()

    const button = screen.getByRole('button', { name: i18n.t('profile.logoutAll') })
    expect(button.className).toContain('bg-destructive')
  })

  it('does not end the sessions until the confirmation is accepted', async () => {
    logoutAll.mockClear()
    const { user } = renderWithProviders(<LogoutAllCard />)

    await user.click(screen.getByRole('button', { name: i18n.t('profile.logoutAll') }))

    expect(await screen.findByText(i18n.t('profile.confirmLogoutAllTitle'))).toBeInTheDocument()
    expect(logoutAll).not.toHaveBeenCalled()
  })

  it('leaves every session alone when the confirmation is dismissed', async () => {
    logoutAll.mockClear()
    const { user } = renderWithProviders(<LogoutAllCard />)

    await user.click(screen.getByRole('button', { name: i18n.t('profile.logoutAll') }))
    await screen.findByText(i18n.t('profile.confirmLogoutAllTitle'))
    await user.click(screen.getByRole('button', { name: i18n.t('action.cancel') }))

    await waitFor(() =>
      expect(screen.queryByText(i18n.t('profile.confirmLogoutAllTitle'))).toBeNull(),
    )
    expect(logoutAll).not.toHaveBeenCalled()
  })
})
