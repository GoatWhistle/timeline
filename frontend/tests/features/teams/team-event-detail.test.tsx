import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { TeamDetailResponse, TeamEventEntryResponse } from '@/shared/api/types.gen'
import { i18n } from '@/shared/i18n/config'

const state: { entry: TeamEventEntryResponse | undefined } = { entry: undefined }

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return {
    ...actual,
    useQuery: () => ({
      data: state.entry,
      isPending: false,
      isFetching: false,
      isError: false,
    }),
  }
})

vi.mock('@/entities/team/team.queries', () => ({
  teamEventEntryQuery: () => ({ queryKey: ['team-event'] }),
  useRosterMember: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

vi.mock('@/features/tracks/team-track-picker', () => ({
  TeamTrackPicker: () => <div data-testid="track-picker" />,
}))

vi.mock('@/features/teams/team-links/team-links-card', () => ({
  TeamLinksCard: () => <div data-testid="links-card" />,
}))

const detail = {
  team: {},
  members: [],
} as unknown as TeamDetailResponse

vi.mock('@/features/teams/team-context', () => ({
  useTeamContext: () => ({ teamId: 'tm_42ej2s5gh7e8', detail, isLead: true }),
}))

const { TeamEventDetail } = await import('@/features/teams/team-event-detail')

const ENTRY = {
  id: 'te_1',
  team_id: 'tm_42ej2s5gh7e8',
  event_id: 'ev_gma9hq8a96q5',
  event_title: 'National hackathon',
  entered_at: '2026-01-03T00:00:00Z',
  registered: false,
  registered_count: 1,
  assigned_members: 2,
  roster_size: 3,
  roster: [],
  tracks: [],
  track_locked: false,
} as unknown as TeamEventEntryResponse

function renderEntry() {
  return renderWithProviders(<TeamEventDetail />, {
    route: '/teams/tm_42ej2s5gh7e8/events/ev_gma9hq8a96q5',
  })
}

describe('one hackathon of a team reads as a page under the team, not a second page', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en')
  })

  beforeEach(() => {
    state.entry = ENTRY
  })

  it('names the hackathon without claiming the top heading of the screen', () => {
    renderEntry()
    expect(screen.getByRole('heading', { name: 'National hackathon' })).toBeInTheDocument()
    expect(screen.queryAllByRole('heading', { level: 1 })).toHaveLength(0)
  })

  it('carries the lineup, the track and the links of that one hackathon', () => {
    renderEntry()
    expect(screen.getByTestId('track-picker')).toBeInTheDocument()
    expect(screen.getByTestId('links-card')).toBeInTheDocument()
  })

  it('offers a way back to the list of hackathons', () => {
    renderEntry()
    const back = screen.getByRole('link', { name: 'Hackathons' })
    expect(back).toHaveAttribute('href', '/teams/tm_42ej2s5gh7e8/events')
  })

  it('reports the self-reported count as derived, never as a checked fact', () => {
    renderEntry()
    expect(screen.getByText(/1 of 3 reported their registration/)).toBeInTheDocument()
    expect(screen.getByText(/derived from what the lineup reported/)).toBeInTheDocument()
  })
})
