import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import type { TeamDetailResponse } from '@/shared/api/types.gen'
import { i18n } from '@/shared/i18n/config'

const context = { teamId: 'tm_42ej2s5gh7e8', detail: {} as TeamDetailResponse, isLead: false }

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

function detail(myState: 'INVITED' | 'ACTIVE'): TeamDetailResponse {
  return {
    team: {
      id: 'tm_42ej2s5gh7e8',
      name: 'Night owls',
      my_state: myState,
      is_lead: false,
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
  } as unknown as TeamDetailResponse
}

function renderOverview(myState: 'INVITED' | 'ACTIVE') {
  context.detail = detail(myState)
  context.isLead = false
  return renderWithProviders(<TeamOverview />)
}

describe('a pending invitation is not described as membership', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en')
  })

  it('does not tell somebody who has only been invited that they are a member', () => {
    renderOverview('INVITED')
    expect(screen.queryByText(i18n.t('team:readOnlyNotice'))).toBeNull()
  })

  it('tells an invited person the invitation is still theirs to accept', () => {
    renderOverview('INVITED')
    expect(screen.getByText(i18n.t('team:invitedNotice'))).toBeTruthy()
  })

  it('still tells an accepted member that they are a member', () => {
    renderOverview('ACTIVE')
    expect(screen.getByText(i18n.t('team:readOnlyNotice'))).toBeTruthy()
    expect(screen.queryByText(i18n.t('team:invitedNotice'))).toBeNull()
  })
})
