import { renderHook, screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import { beforeAll, describe, expect, it } from 'vitest'
import { EventOverlayBody } from '@/features/event-overlay-card/event-overlay-body'
import { EventOverlayCard } from '@/features/event-overlay-card/event-overlay-card'
import type { OverlayCard } from '@/features/event-overlay-card/overlay-model'
import type { OverlayResult } from '@/features/event-overlay-card/overlay-resolvers'
import { isAdminPath, useInAdminSection } from '@/features/event-overlay-card/use-event-overlay'
import { sessionQueryKey } from '@/shared/api/session'
import { i18n } from '@/shared/i18n/config'

const ADMIN_SESSION = {
  id: 'us_1',
  email: 'admin@example.com',
  display_name: 'Administrator',
  is_admin: true,
  email_verified: true,
  profile_public: false,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

const card: OverlayCard = {
  id: 'ev_1',
  title: 'Northwind Voice Agents Sprint',
  organizer: null,
  description: null,
  websiteUrl: null,
  coverUrl: null,
  color: null,
  state: 'ACTIVE',
  startAt: '2026-09-01T09:00:00Z',
  endAt: '2026-10-01T18:00:00Z',
  deadlineAt: null,
  status: null,
  facts: {
    effectiveFormat: 'ONLINE',
    prizePool: null,
    prizeCurrency: null,
    teamSizeMin: undefined,
    teamSizeMax: undefined,
    tracks: [],
  },
  stages: [],
  joined: true,
}

function wrapper(route: string) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
  }
}

beforeAll(async () => {
  await i18n.changeLanguage('en')
})

describe('the administrative card is offered where administration happens', () => {
  it('offers it when the card was opened inside the administrative section', () => {
    renderWithProviders(<EventOverlayBody card={card} canOpenAdmin={true} />)
    const link = screen.getByRole('link', { name: i18n.t('event:overlay.openAdmin') })
    expect(link).toHaveAttribute('href', `/admin/events/${card.id}`)
  })

  it('offers it nowhere else, whoever is looking', () => {
    renderWithProviders(<EventOverlayBody card={card} canOpenAdmin={false} />)
    expect(screen.queryByRole('link', { name: i18n.t('event:overlay.openAdmin') })).toBeNull()
  })
})

describe('the place is read from the route, not from the role', () => {
  it('counts the administrative section and everything under it', () => {
    expect(isAdminPath('/admin')).toBe(true)
    expect(isAdminPath('/admin/events')).toBe(true)
    expect(isAdminPath('/admin/events/ev_1')).toBe(true)
  })

  it('counts nothing else, including a path that merely begins the same way', () => {
    expect(isAdminPath('/catalog')).toBe(false)
    expect(isAdminPath('/schedule')).toBe(false)
    expect(isAdminPath('/events/ev_1')).toBe(false)
    expect(isAdminPath('/administrators')).toBe(false)
  })

  it('reports the administrative section while the reader stands in it', () => {
    const { result } = renderHook(useInAdminSection, {
      wrapper: wrapper('/admin/events?card=ev_1'),
    })
    expect(result.current).toBe(true)
  })

  it('reports no administrative section from the catalog', () => {
    const { result } = renderHook(useInAdminSection, { wrapper: wrapper('/catalog?card=ev_1') })
    expect(result.current).toBe(false)
  })
})

function renderMountedCard(route: string) {
  const result: OverlayResult = { card, loading: false, stale: false, error: null, retry: () => {} }
  const view = renderWithProviders(<EventOverlayCard result={result} />, { route })
  view.queryClient.setQueryData(sessionQueryKey, ADMIN_SESSION)
  return view
}

function adminLink(): HTMLElement | null {
  return screen.queryByRole('link', { name: i18n.t('event:overlay.openAdmin') })
}

describe('an administrator gets the administrative card only where administration happens', () => {
  it('offers it to an administrator standing in the administrative section', async () => {
    renderMountedCard(`/admin/events?card=${card.id}`)
    await waitFor(() => expect(adminLink()).not.toBeNull())
    expect(adminLink()).toHaveAttribute('href', `/admin/events/${card.id}`)
  })

  it('withholds it from the same administrator standing in the catalog', async () => {
    renderMountedCard(`/catalog?card=${card.id}`)
    await waitFor(() =>
      expect(screen.getByRole('link', { name: i18n.t('event:overlay.openFull') })).toBeTruthy(),
    )
    expect(adminLink()).toBeNull()
  })

  it('withholds it from the same administrator standing in the schedule', async () => {
    renderMountedCard(`/schedule?card=${card.id}`)
    await waitFor(() =>
      expect(screen.getByRole('link', { name: i18n.t('event:overlay.openFull') })).toBeTruthy(),
    )
    expect(adminLink()).toBeNull()
  })
})
