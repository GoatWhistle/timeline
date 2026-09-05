import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it, vi } from 'vitest'
import type { TeamDetailResponse } from '@/shared/api/types.gen'

const context = {
  teamId: 'tm_42ej2s5gh7e8',
  detail: {
    team: {
      id: 'tm_42ej2s5gh7e8',
      name: 'Night owls',
      my_state: 'ACTIVE',
      is_lead: true,
      lead: {
        id: 'us_42ej2s5gh7e8',
        first_name: 'Ivan',
        last_name: 'Petrov',
        display_name: 'Ivan Petrov',
        nickname: 'ivan',
        email: 'ivan@example.com',
        is_active: true,
      },
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
    members: [],
  } as unknown as TeamDetailResponse,
  isLead: true,
}

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>()
  return { ...actual, useOutletContext: () => context }
})

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return { ...actual, useQuery: () => ({ data: { items: [] } }) }
})

vi.mock('@/entities/team/team.queries', () => ({
  teamEventsQuery: (teamId: string) => ({ queryKey: ['team-events', teamId] }),
}))

const { TeamOverview } = await import('@/features/teams/team-overview')

describe('the members/hackathons tile pair stays a compact summary, not a stretched slab', () => {
  it('caps the tile grid so a wide screen leaves page margin instead of ballooning two tiles', () => {
    const { container } = renderWithProviders(<TeamOverview />)
    const grid = container.querySelector('.grid')
    expect(grid?.className).toContain('max-w-2xl')
  })
})
