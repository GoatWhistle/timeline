import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { beforeAll, describe, expect, it } from 'vitest'
import {
  DEFAULT_SECTION,
  resolveSection,
  SETTINGS_SECTIONS,
  type SettingsSectionId,
} from '@/features/settings-overlay/sections'
import { SettingsPanel } from '@/features/settings-overlay/settings-panels'
import type {
  Channel,
  MeResponse,
  NotificationOccasion,
  NotificationPreference,
} from '@/shared/api/types.gen'
import { i18n } from '@/shared/i18n/config'
import { ShortcutProvider } from '@/shared/keyboard/shortcut-registry'
import { TooltipProvider } from '@/shared/ui/overlays/tooltip'

const OCCASIONS: NotificationOccasion[] = [
  'REGISTRATION_REQUIRED',
  'REMINDER_REGISTRATION_DEADLINE',
  'REGISTRATION_OVERDUE',
]
const CHANNELS: Channel[] = ['TELEGRAM', 'EMAIL']

const NOTIFICATION_PREFERENCES: NotificationPreference[] = OCCASIONS.flatMap((occasion) =>
  CHANNELS.map((channel) => ({ occasion, channel, enabled: true })),
)

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

function renderSection(section: SettingsSectionId) {
  return renderWithProviders(
    <ShortcutProvider>
      <TooltipProvider>
        <SettingsPanel
          section={section}
          user={USER}
          notificationPreferences={NOTIFICATION_PREFERENCES}
        />
      </TooltipProvider>
    </ShortcutProvider>,
  )
}

beforeAll(async () => {
  await i18n.changeLanguage('ru')
})

describe('settings sections', () => {
  it('offers the specification sections, with the danger zone folded into account', () => {
    expect(SETTINGS_SECTIONS.map((section) => section.id)).toEqual([
      'profile',
      'account',
      'appearance',
      'notifications',
      'shortcuts',
      'sessions',
    ])
  })

  it.each(['danger', 'unknown-section', ''])(
    'resolves the retired or unknown value %j to the default section',
    (value) => {
      expect(resolveSection(value)).toBe(DEFAULT_SECTION)
    },
  )

  it('gives every section an icon so the list is not colour alone', () => {
    for (const section of SETTINGS_SECTIONS) {
      expect(section.icon, section.id).toBeTruthy()
      expect(section.labelKey, section.id).toMatch(/^settings\./)
    }
  })
})

describe('account against profile', () => {
  it('keeps the display name and the links in profile', () => {
    renderSection('profile')

    expect(screen.getByLabelText(i18n.t('common:profile.name'))).toBeInTheDocument()
    expect(screen.queryByLabelText(i18n.t('common:profile.newEmail'))).not.toBeInTheDocument()
    expect(screen.queryByText('member@example.com')).not.toBeInTheDocument()
  })

  it('keeps the email address and its change flow in account', async () => {
    const { user } = renderSection('account')

    expect(screen.getByText('member@example.com')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: i18n.t('common:account.emailChange') }))
    expect(screen.getByLabelText(i18n.t('common:profile.newEmail'))).toBeInTheDocument()
  })

  it('keeps Telegram linking in account, not in notifications', () => {
    renderSection('account')
    expect(
      screen.getByRole('button', { name: i18n.t('common:account.telegramLink') }),
    ).toBeInTheDocument()
  })

  it('leaves notifications with the channel selection only', () => {
    renderSection('notifications')

    expect(
      screen.queryByRole('button', { name: i18n.t('common:account.telegramLink') }),
    ).not.toBeInTheDocument()
    expect(screen.queryByText('member@example.com')).not.toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: i18n.t('notification:card.title') }),
    ).toBeInTheDocument()
  })

  it('answers what arrives and when, not only which channel', () => {
    renderSection('notifications')

    expect(screen.getByText(i18n.t('notification:explainer.title'))).toBeInTheDocument()
    for (const type of [
      'REGISTRATION_REQUIRED',
      'REMINDER_REGISTRATION_DEADLINE',
      'REGISTRATION_OVERDUE',
    ])
      expect(
        document.querySelector(`[data-explainer-type="${type}"]`),
        `type ${type} is unexplained`,
      ).not.toBeNull()
  })

  it('does not repeat the display name in account', () => {
    renderSection('account')
    expect(screen.queryByLabelText(i18n.t('common:profile.name'))).not.toBeInTheDocument()
  })

  it('folds account deactivation into the account tab, not a separate danger tab', () => {
    renderSection('account')

    expect(
      screen.getByRole('button', { name: i18n.t('common:profile.deactivate') }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: i18n.t('common:profile.logoutAll') }),
    ).not.toBeInTheDocument()
  })

  it('offers a password change in account, below the channel bindings', () => {
    renderSection('account')

    expect(
      screen.getByRole('button', { name: i18n.t('common:profile.changePassword') }),
    ).toBeInTheDocument()
  })
})
