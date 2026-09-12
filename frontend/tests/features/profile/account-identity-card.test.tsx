import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it } from 'vitest'
import { AccountIdentityCard } from '@/features/profile/account-identity-card/account-identity-card'
import type { MeResponse } from '@/shared/api/types.gen'
import { i18n } from '@/shared/i18n/config'

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

function renderCard(emailVerified: boolean) {
  return renderWithProviders(
    <AccountIdentityCard user={{ ...USER, email_verified: emailVerified }} />,
  )
}

function mark(): HTMLElement {
  return document.querySelector('[data-email-verified]') as HTMLElement
}

describe('the confirmed email is shown as a mark, without a word beside it', () => {
  it('does not print the wording next to the address', () => {
    renderCard(true)
    const label = i18n.t('account.emailVerifiedMark')
    expect(screen.queryByText(label)).toBeNull()
  })

  it('shows a mark rather than a badge carrying text', () => {
    renderCard(true)
    expect(mark()).not.toBeNull()
    expect(mark().textContent).toBe('')
  })
})

describe('the mark keeps its meaning without a mouse', () => {
  it('carries an accessible name, so a screen reader still announces the state', () => {
    renderCard(true)
    expect(
      screen.getByRole('button', { name: i18n.t('account.emailVerifiedMark') }),
    ).toBeInTheDocument()
  })

  it('also carries a title, so a pointer that never hovers still reveals it', () => {
    renderCard(true)
    expect(mark()).toHaveAttribute('title', i18n.t('account.emailVerifiedMark'))
  })

  it('is reachable by keyboard, so the tooltip is not mouse-only', async () => {
    const { user } = renderCard(true)
    await user.tab()
    expect(mark()).toHaveFocus()
  })

  it('names the unconfirmed state just as explicitly', () => {
    renderCard(false)
    expect(
      screen.getByRole('button', { name: i18n.t('account.emailUnverifiedMark') }),
    ).toBeInTheDocument()
    expect(mark()).toHaveAttribute('title', i18n.t('account.emailUnverifiedMark'))
  })

  it('never leaves the icon bare of a name', () => {
    renderCard(true)
    expect(mark().getAttribute('aria-label')).toBeTruthy()
  })
})

describe('the wording moves into the tooltip', () => {
  it('reveals the wording on hover', async () => {
    const { user } = renderCard(true)
    await user.hover(mark())
    await waitFor(() => {
      expect(screen.getAllByText(i18n.t('account.emailVerifiedMark')).length).toBeGreaterThan(0)
    })
  })
})
