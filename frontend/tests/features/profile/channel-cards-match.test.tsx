import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it, vi } from 'vitest'
import { EmailChangeCard } from '@/features/profile/email-change-card/email-change-card'
import { TelegramLinkCard } from '@/features/profile/telegram-link-card/telegram-link-card'
import type { MeResponse } from '@/shared/api/types.gen'
import { i18n } from '@/shared/i18n/config'

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

vi.mock('@/entities/user/profile.queries', () => ({
  useChangeEmail: () => ({ mutateAsync: vi.fn(), isPending: false }),
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

function shapeOf(container: HTMLElement) {
  const card = container.querySelector('[data-slot=card]')
  if (!card) throw new Error('no card')
  const value = card.querySelector('span.font-medium')
  const notes = [...card.querySelectorAll('[data-slot=card-description]')]
  const withClasses = (node: Element | null | undefined) => {
    if (!node) return ''
    const inner = [...node.querySelectorAll('*')]
      .map((child) => (typeof child.className === 'string' ? child.className : ''))
      .join(' ')
    return `${node.className} ${inner}`.trim()
  }
  return {
    hasHeader: Boolean(card.querySelector('[data-slot=card-header]')),
    valueClass: withClasses(value),
    lineCount: (value ? 1 : 0) + notes.length,
    actionCount: card.querySelectorAll('[data-slot=card-content] button:not([data-email-verified])')
      .length,
  }
}

function emailShape(emailVerified = true) {
  const { container } = renderWithProviders(
    <EmailChangeCard email={USER.email} emailVerified={emailVerified} />,
  )
  return shapeOf(container)
}

function telegramShape() {
  const { container } = renderWithProviders(<TelegramLinkCard user={USER} />)
  return shapeOf(container)
}

describe('the two links are one component, not two shapes of the same idea', () => {
  it('writes the value under the title the same way, whichever channel wears it', () => {
    const linkedEmail = emailShape()
    const linkedTelegram = shapeOf(
      renderWithProviders(
        <TelegramLinkCard user={{ ...USER, telegram_linked: true, telegram_username: 'ivan' }} />,
      ).container,
    )

    expect(linkedEmail.valueClass, 'the email card must publish its address').not.toBe('')
    expect(linkedTelegram.valueClass, 'the telegram card must publish its handle').not.toBe('')
    expect(
      linkedEmail.valueClass,
      'two channels styling the same line differently read as two components',
    ).toBe(linkedTelegram.valueClass)
  })

  it('gives both channels a header and a single action in the same place', () => {
    const email = emailShape()
    const telegram = telegramShape()

    expect(email.hasHeader).toBe(true)
    expect(telegram.hasHeader).toBe(true)
    expect(email.actionCount).toBe(telegram.actionCount)
  })

  it('names every state from one dictionary, not two wordings', () => {
    const { container } = renderWithProviders(<TelegramLinkCard user={USER} />)
    expect(container.textContent).toContain(i18n.t('account.channelUnlinked'))

    const email = renderWithProviders(
      <EmailChangeCard email={USER.email} emailVerified={false} pendingEmail="next@example.com" />,
    )
    expect(email.container.textContent).toContain(i18n.t('common:profile.emailPending'))
    expect(
      email.container.textContent,
      'the reader has to know which address the confirmation went to',
    ).toContain('next@example.com')
  })

  it('shows the value of each channel, not only one of them', () => {
    const email = emailShape()
    const telegram = shapeOf(
      renderWithProviders(
        <TelegramLinkCard user={{ ...USER, telegram_linked: true, telegram_username: 'ivan' }} />,
      ).container,
    )

    expect(email.lineCount).toBeGreaterThan(0)
    expect(telegram.lineCount).toBeGreaterThan(0)
  })
})
