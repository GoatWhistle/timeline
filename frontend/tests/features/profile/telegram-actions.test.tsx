import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { TelegramLinkCard } from '@/features/profile/telegram-link-card/telegram-link-card'
import type { MeResponse } from '@/shared/api/types.gen'
import { i18n } from '@/shared/i18n/config'

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

vi.mock('@/entities/user/profile.queries', () => ({
  useLinkTelegram: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUnlinkTelegram: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

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

function renderCard(overrides: Partial<MeResponse> = {}) {
  return renderWithProviders(<TelegramLinkCard user={{ ...USER, ...overrides }} />)
}

beforeAll(async () => {
  await i18n.changeLanguage('en')
})

describe('the Telegram card names the action that fits its state', () => {
  it('offers to link when no account is attached', () => {
    renderCard()

    expect(screen.getByRole('button', { name: i18n.t('account.telegramLink') })).toBeInTheDocument()
  })

  it('offers to change the account once one is attached', () => {
    renderCard({ telegram_linked: true, telegram_username: 'ivan' })

    expect(
      screen.getByRole('button', { name: i18n.t('account.telegramChange') }),
      'a linked account still needs a way to move to another one',
    ).toBeInTheDocument()
  })

  it('never offers to link an account that is already linked', () => {
    renderCard({ telegram_linked: true, telegram_username: 'ivan' })

    expect(screen.queryByRole('button', { name: i18n.t('account.telegramLink') })).toBeNull()
  })

  it('shows the attached account by its handle', () => {
    renderCard({ telegram_linked: true, telegram_username: 'ivan' })

    expect(screen.getByText('@ivan')).toBeInTheDocument()
  })

  it('keeps unlinking available beside the change', () => {
    renderCard({ telegram_linked: true, telegram_username: 'ivan' })

    expect(
      screen.getByRole('button', { name: i18n.t('account.telegramUnlink') }),
    ).toBeInTheDocument()
  })
})
