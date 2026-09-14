import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@tests/support/render'
import { beforeAll, describe, expect, it } from 'vitest'
import { SettingsPanel } from '@/features/settings-overlay/settings-panels'
import type { MeResponse, NotificationPreference } from '@/shared/api/types.gen'
import { i18n } from '@/shared/i18n/config'
import { ShortcutProvider } from '@/shared/keyboard/shortcut-registry'
import { TooltipProvider } from '@/shared/ui/overlays/tooltip'

const USER: MeResponse = {
  id: '4b7a7cf5-3f45-4b7e-a3d9-9f27b8a1c2d3',
  email: 'member@example.com',
  email_verified: true,
  first_name: 'Ivan',
  last_name: 'Petrov',
  display_name: 'Petrov Ivan',
  profile_public: false,
  profile_visibility: 'private',
  pinned_event_ids: [],
  theme: 'system',
  bio: 'Backend developer',
  avatar_url: 'https://example.com/a.png',
  is_active: true,
  is_admin: false,
  locale: 'ru',
  telegram_linked: false,
  notification_channels: ['TELEGRAM', 'EMAIL'],
  shortcuts: {},
  timezone: 'Europe/Moscow',
  created_at: '2026-01-10T10:00:00Z',
  updated_at: '2026-08-01T10:00:00Z',
}

const NO_PREFERENCES: NotificationPreference[] = []

function renderAccount() {
  return renderWithProviders(
    <ShortcutProvider>
      <TooltipProvider>
        <SettingsPanel section="account" user={USER} notificationPreferences={NO_PREFERENCES} />
      </TooltipProvider>
    </ShortcutProvider>,
  )
}

function cardFor(name: string): HTMLElement {
  const heading = screen.getByRole('heading', { name })
  const card = heading.closest('[data-slot="card"]') ?? heading.parentElement?.parentElement
  if (!(card instanceof HTMLElement)) throw new Error(`no card around ${name}`)
  return card
}

beforeAll(async () => {
  await i18n.changeLanguage('ru')
})

describe('the account danger zone pairs password change with deactivation', () => {
  it('marks the password card as destructive, the way deactivation is marked', () => {
    renderAccount()

    const password = cardFor(i18n.t('common:profile.passwordTitle'))
    const deactivate = cardFor(i18n.t('common:profile.deactivateTitle'))

    expect(
      deactivate.className,
      'deactivation is the reference for how a danger card looks',
    ).toMatch(/border-destructive/)
    expect(
      password.className,
      'a password change that is not marked destructive reads as an ordinary setting',
    ).toMatch(/border-destructive/)
  })

  it('stands the two danger cards side by side rather than stacked', () => {
    renderAccount()

    const password = cardFor(i18n.t('common:profile.passwordTitle'))
    const deactivate = cardFor(i18n.t('common:profile.deactivateTitle'))
    const row = password.parentElement

    expect(row, 'the danger cards need a shared row').toBe(deactivate.parentElement)
    expect(row?.className, 'a stacked pair is not the sessions pattern').toMatch(/sm:flex-row/)
  })

  it('gives the password change a red button, not the default one', () => {
    renderAccount()

    const password = cardFor(i18n.t('common:profile.passwordTitle'))
    const button = within(password).getByRole('button', {
      name: i18n.t('common:profile.changePassword'),
    })

    expect(
      button.className,
      'a blue button in a red card contradicts the danger it belongs to',
    ).toMatch(/destructive/)
  })

  it('opens the form in a dialog instead of unfolding the card', async () => {
    const user = userEvent.setup()
    renderAccount()

    const password = cardFor(i18n.t('common:profile.passwordTitle'))
    expect(
      screen.queryByLabelText(i18n.t('common:profile.currentPassword')),
      'the form must stay closed until asked for',
    ).toBeNull()

    await user.click(
      within(password).getByRole('button', { name: i18n.t('common:profile.changePassword') }),
    )

    const dialog = await screen.findByRole('dialog')
    expect(
      within(dialog).getByLabelText(i18n.t('common:profile.currentPassword')),
      'the fields belong to the dialog, not to the card below the button',
    ).toBeInTheDocument()
  })

  it('closes the dialog again when the form is dismissed', async () => {
    const user = userEvent.setup()
    renderAccount()

    const password = cardFor(i18n.t('common:profile.passwordTitle'))
    await user.click(
      within(password).getByRole('button', { name: i18n.t('common:profile.changePassword') }),
    )

    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: i18n.t('common:action.cancel') }))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('keeps both danger hints to a single line so the buttons line up', () => {
    renderAccount()

    for (const key of ['common:profile.passwordHint', 'common:profile.deactivateHint']) {
      const hint = i18n.t(key)
      expect(hint.length, `${key} is long enough to wrap and misalign the pair`).toBeLessThan(60)
    }
  })
})
