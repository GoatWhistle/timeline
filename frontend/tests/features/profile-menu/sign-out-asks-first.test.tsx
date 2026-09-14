import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@tests/support/render'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { ProfileMenu } from '@/features/profile-menu/profile-menu'
import { i18n } from '@/shared/i18n/config'

const logout = vi.fn(() => Promise.resolve())

vi.mock('@/entities/session/session.queries', () => ({
  useLogout: () => ({ mutateAsync: logout, isPending: false }),
}))

vi.mock('@/features/settings-overlay/use-settings-overlay', () => ({
  useSettingsOverlay: () => ({ openSettings: vi.fn(), openIndex: vi.fn() }),
}))

function renderMenu() {
  return renderWithProviders(
    <ProfileMenu
      userId="us_1"
      displayName="Mikhail Khorokhorin"
      firstName="Mikhail"
      lastName="Khorokhorin"
      email="mk@example.com"
      avatarUrl={null}
    />,
  )
}

async function openSignOut(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /mk@example.com/ }))
  await user.click(await screen.findByRole('menuitem', { name: i18n.t('common:action.logout') }))
}

beforeAll(async () => {
  await i18n.changeLanguage('ru')
})

describe('signing out asks before it happens', () => {
  it('does not sign out the moment the menu item is chosen', async () => {
    const user = userEvent.setup()
    logout.mockClear()
    renderMenu()

    await openSignOut(user)

    expect(
      logout,
      'a sign-out that fires straight from the menu gives no way back from a misclick',
    ).not.toHaveBeenCalled()
  })

  it('puts the question in the same confirmation panel the rest of the app uses', async () => {
    const user = userEvent.setup()
    logout.mockClear()
    renderMenu()

    await openSignOut(user)

    const panel = await screen.findByRole('alertdialog')
    expect(panel.getAttribute('data-slot')).toBe('dialog-content')
    expect(screen.getByText(i18n.t('common:profile.confirmLogoutTitle'))).toBeInTheDocument()
  })

  it('signs out once the question is answered', async () => {
    const user = userEvent.setup()
    logout.mockClear()
    renderMenu()

    await openSignOut(user)
    const panel = await screen.findByRole('alertdialog')
    const confirm = [...panel.querySelectorAll('button')].find(
      (button) => button.textContent?.trim() === i18n.t('common:action.logout'),
    )
    if (!confirm) throw new Error('the confirming button is missing')
    await user.click(confirm)

    await waitFor(() => expect(logout).toHaveBeenCalledTimes(1))
  })

  it('keeps the session when the question is dismissed', async () => {
    const user = userEvent.setup()
    logout.mockClear()
    renderMenu()

    await openSignOut(user)
    const panel = await screen.findByRole('alertdialog')
    const cancel = [...panel.querySelectorAll('button')].find(
      (button) => button.textContent?.trim() === i18n.t('common:action.cancel'),
    )
    if (!cancel) throw new Error('the cancel button is missing')
    await user.click(cancel)

    expect(logout).not.toHaveBeenCalled()
  })
})
