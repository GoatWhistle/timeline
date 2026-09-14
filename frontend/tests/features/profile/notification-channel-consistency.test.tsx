import { renderWithProviders } from '@tests/support/render'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { NotificationChannelCard } from '@/features/profile/notification-channel-card/notification-channel-card'
import { NotificationExplainerCard } from '@/features/profile/notification-explainer-card/notification-explainer-card'
import type { Channel, MeResponse, NotificationPreference } from '@/shared/api/types.gen'
import { i18nReady } from '@/shared/i18n/config'

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

vi.mock('@/entities/user/profile.queries', () => ({
  useUpdateProfile: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

vi.mock('@/entities/notification/reminder-schedule.queries', () => ({
  useReminderSchedule: () => ({ data: undefined }),
  useUpdateReminderSchedule: () => ({ mutate: vi.fn(), isPending: false }),
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

const PREFERENCES: NotificationPreference[] = [
  { occasion: 'REGISTRATION_REQUIRED', channel: 'TELEGRAM', enabled: true },
  { occasion: 'REGISTRATION_REQUIRED', channel: 'EMAIL', enabled: true },
]

function liveOf(user: MeResponse): Set<Channel> {
  const available: Record<Channel, boolean> = {
    TELEGRAM: user.telegram_linked,
    EMAIL: user.email_verified,
  }
  return new Set(user.notification_channels.filter((channel) => available[channel]))
}

function switchesFor(container: HTMLElement, channel: Channel) {
  return [...container.querySelectorAll(`[data-occasion-channel="${channel}"]`)]
}

beforeAll(async () => {
  await i18nReady
})

describe('an occasion cannot promise delivery on a channel that carries nothing', () => {
  it('leaves every switch of an unusable channel inoperable, not merely styled', () => {
    const { container } = renderWithProviders(
      <NotificationExplainerCard preferences={PREFERENCES} liveChannels={liveOf(USER)} />,
    )

    const telegram = switchesFor(container, 'TELEGRAM')
    expect(telegram.length, 'the telegram column must exist to be judged').toBeGreaterThan(0)
    for (const cell of telegram) {
      expect(
        cell.getAttribute('data-channel-live'),
        'telegram is unlinked, so it is not live',
      ).toBe('false')
      const control = cell.querySelector('[role=switch]')
      expect(control?.hasAttribute('disabled'), 'a dead channel must not accept a toggle').toBe(
        true,
      )
    }
  })

  it('keeps the switches of a usable channel operable', () => {
    const { container } = renderWithProviders(
      <NotificationExplainerCard preferences={PREFERENCES} liveChannels={liveOf(USER)} />,
    )

    const email = switchesFor(container, 'EMAIL')
    expect(email.length).toBeGreaterThan(0)
    for (const cell of email) {
      expect(cell.getAttribute('data-channel-live')).toBe('true')
      expect(cell.querySelector('[role=switch]')?.hasAttribute('disabled')).toBe(false)
    }
  })

  it('treats a channel the reader switched off as just as dead as an unlinked one', () => {
    const user = { ...USER, telegram_linked: true, notification_channels: ['EMAIL'] as Channel[] }
    const { container } = renderWithProviders(
      <NotificationExplainerCard preferences={PREFERENCES} liveChannels={liveOf(user)} />,
    )

    for (const cell of switchesFor(container, 'TELEGRAM')) {
      expect(
        cell.getAttribute('data-channel-live'),
        'a channel turned off delivers nothing, linked or not',
      ).toBe('false')
    }
  })

  it('the channel card marks an unusable channel as off rather than showing it on', () => {
    const { container } = renderWithProviders(<NotificationChannelCard user={USER} />)

    const telegram = container.querySelector('[data-notification-channel="TELEGRAM"]')
    expect(
      telegram?.getAttribute('data-channel-on'),
      'telegram is unlinked, so the card must not claim it is on',
    ).toBe('false')
    expect(
      container
        .querySelector('[data-notification-channel="EMAIL"]')
        ?.getAttribute('data-channel-on'),
    ).toBe('true')
  })
})
