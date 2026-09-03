import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { TeamEventLink, TeamEventLinkListResponse } from '@/shared/api/types.gen'
import { i18n } from '@/shared/i18n/config'

const state: { data: Partial<TeamEventLinkListResponse> | undefined } = { data: undefined }

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return { ...actual, useQuery: () => ({ data: state.data }) }
})

vi.mock('@/entities/team/team-links.queries', () => ({
  teamEventLinksQuery: () => ({ queryKey: ['team-event-links'] }),
  useAddTeamEventLink: () => ({ mutateAsync: vi.fn() }),
  useUpdateTeamEventLink: () => ({ mutateAsync: vi.fn() }),
  useRemoveTeamEventLink: () => ({ mutate: vi.fn() }),
  useReorderTeamEventLinks: () => ({ mutate: vi.fn() }),
}))

const { TeamLinksCard } = await import('@/features/teams/team-links/team-links-card')

const LINKS: TeamEventLink[] = [
  {
    id: 'tl_1',
    entry_id: 'te_1',
    url: 'https://github.com/team/project',
    label: 'Our repository',
    sort_order: 0,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
]

function renderCard() {
  return renderWithProviders(<TeamLinksCard teamId="tm_42ej2s5gh7e8" eventId="ev_gma9hq8a96q5" />)
}

describe('team links card honours the write permission the server reports', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en')
  })

  beforeEach(() => {
    state.data = undefined
  })

  it('shows the add form when the server says the caller may write', () => {
    state.data = { items: LINKS, can_write: true }
    renderCard()
    expect(screen.getByRole('region', { name: i18n.t('team:links.addTitle') })).toBeTruthy()
  })

  it('hides the add form when the server says the caller may not write', () => {
    state.data = { items: LINKS, can_write: false }
    renderCard()
    expect(screen.queryByRole('region', { name: i18n.t('team:links.addTitle') })).toBeNull()
    expect(screen.getByRole('link', { name: 'Our repository' })).toBeTruthy()
  })

  it('withholds the add form while the permission is still unknown', () => {
    state.data = undefined
    renderCard()
    expect(screen.queryByRole('region', { name: i18n.t('team:links.addTitle') })).toBeNull()
  })

  it('withholds the add form when the response carries no permission at all', () => {
    state.data = { items: LINKS }
    renderCard()
    expect(screen.queryByRole('region', { name: i18n.t('team:links.addTitle') })).toBeNull()
  })
})
