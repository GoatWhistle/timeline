import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { beforeEach, describe, expect, it } from 'vitest'
import { VerificationBanner } from '@/features/auth/verification-banner/verification-banner'
import { sessionQueryKey } from '@/shared/api/session'
import { i18n } from '@/shared/i18n/config'

const STORAGE_KEY = 'timeline.verification-banner.dismissed'

const UNVERIFIED = {
  id: 'us_42ej2s5gh7e8',
  email: 'alice@example.com',
  first_name: 'Alice',
  last_name: 'Ivanova',
  is_admin: false,
  is_active: true,
  email_verified: false,
  locale: 'en',
  timezone: 'UTC',
  profile_public: false,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

function renderBanner(user: Record<string, unknown> = UNVERIFIED) {
  const view = renderWithProviders(<VerificationBanner />)
  view.queryClient.setQueryData(sessionQueryKey, user)
  return view
}

function dismissButton(): HTMLElement {
  return screen.getByRole('button', { name: i18n.t('auth:banner.dismiss') })
}

describe('the unverified email reminder can be put away', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('offers a way to hide itself', async () => {
    renderBanner()
    expect(await screen.findByRole('status')).toBeInTheDocument()
    expect(dismissButton()).toBeInTheDocument()
  })

  it('disappears once hidden', async () => {
    const { user } = renderBanner()
    await screen.findByRole('status')

    await user.click(dismissButton())
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('remembers being hidden, so it does not return on the next visit', async () => {
    const first = renderBanner()
    await screen.findByRole('status')
    await first.user.click(dismissButton())
    first.unmount()

    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(UNVERIFIED.email)

    const { queryClient } = renderBanner()
    await waitFor(() => {
      expect(queryClient.getQueryData(sessionQueryKey)).toBeDefined()
    })
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('comes back for a different address, because that address is unconfirmed too', async () => {
    const { user } = renderBanner()
    await screen.findByRole('status')
    await user.click(dismissButton())

    renderBanner({ ...UNVERIFIED, email: 'bob@example.com' })
    expect(await screen.findByRole('status')).toBeInTheDocument()
  })

  it('says nothing at all once the address is confirmed', () => {
    renderBanner({ ...UNVERIFIED, email_verified: true })
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('names the dismiss control for a screen reader rather than showing a bare icon', async () => {
    renderBanner()
    await screen.findByRole('status')
    expect(dismissButton().getAttribute('aria-label')).toBe(i18n.t('auth:banner.dismiss'))
  })
})
