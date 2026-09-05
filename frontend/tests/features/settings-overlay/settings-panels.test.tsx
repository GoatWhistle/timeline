import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { beforeAll, describe, expect, it } from 'vitest'
import { SETTINGS_SECTIONS, type SettingsSectionId } from '@/features/settings-overlay/sections'
import { SettingsPanel } from '@/features/settings-overlay/settings-panels'
import type { MeResponse } from '@/shared/api/types.gen'
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
  bio: 'Backend developer',
  avatar_url: 'https://example.com/a.png',
  is_active: true,
  is_admin: false,
  locale: 'ru',
  telegram_linked: false,
  shortcuts: {},
  timezone: 'Europe/Moscow',
  created_at: '2026-01-10T10:00:00Z',
  updated_at: '2026-08-01T10:00:00Z',
}

function renderSection(section: SettingsSectionId) {
  return renderWithProviders(
    <ShortcutProvider>
      <TooltipProvider>
        <SettingsPanel section={section} user={USER} />
      </TooltipProvider>
    </ShortcutProvider>,
  )
}

beforeAll(async () => {
  await i18n.changeLanguage('ru')
})

describe('settings sections', () => {
  it('offers all six sections the specification names, plus shortcuts', () => {
    expect(SETTINGS_SECTIONS.map((section) => section.id)).toEqual([
      'profile',
      'account',
      'appearance',
      'notifications',
      'shortcuts',
      'sessions',
      'danger',
    ])
  })

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

  it('keeps the email address and its change flow in account', () => {
    renderSection('account')

    expect(screen.getByText('member@example.com')).toBeInTheDocument()
    expect(screen.getByLabelText(i18n.t('common:profile.newEmail'))).toBeInTheDocument()
  })

  it('keeps Telegram linking in account, not in notifications', () => {
    renderSection('account')
    expect(
      screen.getByRole('button', { name: i18n.t('common:account.telegramLink') }),
    ).toBeInTheDocument()
  })

  it('leaves notifications with the channel preference only', () => {
    renderSection('notifications')

    expect(
      screen.queryByRole('button', { name: i18n.t('common:account.telegramLink') }),
    ).not.toBeInTheDocument()
    expect(screen.queryByText('member@example.com')).not.toBeInTheDocument()
    expect(screen.getByText(i18n.t('notification:card.preferred'))).toBeInTheDocument()
  })

  it('answers what arrives and when, not only which channel', () => {
    renderSection('notifications')

    expect(screen.getByText(i18n.t('notification:explainer.title'))).toBeInTheDocument()
    expect(screen.getByText(i18n.t('notification:explainer.stopTitle'))).toBeInTheDocument()
    for (const type of ['REGISTRATION_REQUIRED', 'REGISTRATION_REMINDER', 'REGISTRATION_OVERDUE'])
      expect(
        document.querySelector(`[data-explainer-type="${type}"]`),
        `type ${type} is unexplained`,
      ).not.toBeNull()
  })

  it('does not repeat the display name in account', () => {
    renderSection('account')
    expect(screen.queryByLabelText(i18n.t('common:profile.name'))).not.toBeInTheDocument()
  })

  it('leaves the danger zone with deactivation only', () => {
    renderSection('danger')

    expect(
      screen.getByRole('button', { name: i18n.t('common:profile.deactivate') }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: i18n.t('common:profile.logoutAll') }),
    ).not.toBeInTheDocument()
  })
})
