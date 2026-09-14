import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@tests/support/render'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { TelegramLinkCard } from '@/features/profile/telegram-link-card/telegram-link-card'
import type { MeResponse } from '@/shared/api/types.gen'
import { i18n } from '@/shared/i18n/config'

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

const link = vi.fn(() => Promise.resolve({ deep_link: 'https://t.me/bot?start=abc' }))

vi.mock('@/entities/user/profile.queries', () => ({
  useLinkTelegram: () => ({ mutateAsync: link, isPending: false }),
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

beforeAll(async () => {
  await i18n.changeLanguage('en')
})

beforeEach(() => {
  link.mockClear()
  vi.useFakeTimers({ shouldAdvanceTime: true })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('a Telegram link finishes without the reader reloading the page', () => {
  it('asks the server again while the link is still pending', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const { queryClient } = renderWithProviders(<TelegramLinkCard user={USER} />)
    const spy = vi.spyOn(queryClient, 'invalidateQueries')

    await user.click(screen.getByRole('button', { name: i18n.t('account.telegramLink') }))
    await waitFor(() =>
      expect(screen.getByText(i18n.t('account.telegramOpen'))).toBeInTheDocument(),
    )

    spy.mockClear()
    await vi.advanceTimersByTimeAsync(7000)

    expect(
      spy.mock.calls.length,
      'linking happens inside Telegram, so the page has to ask whether it worked',
    ).toBeGreaterThan(0)
  })

  it('stops asking once no link is pending', async () => {
    const { queryClient } = renderWithProviders(<TelegramLinkCard user={USER} />)
    const spy = vi.spyOn(queryClient, 'invalidateQueries')

    await vi.advanceTimersByTimeAsync(7000)

    expect(spy.mock.calls.length, 'a card with nothing pending must stay quiet').toBe(0)
  })
})
