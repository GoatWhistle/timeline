import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { beforeAll, describe, expect, it } from 'vitest'
import { RosterTable } from '@/features/teams/roster-table'
import type { TeamEventEntryResponse, TeamMemberResponse } from '@/shared/api/types.gen'
import { i18n } from '@/shared/i18n/config'

function member(id: string, name: string): TeamMemberResponse {
  return {
    id: `tb_${id}`,
    team_id: 'tm_42ej2s5gh7e8',
    invited_at: '2026-01-01T00:00:00Z',
    joined_at: '2026-01-02T00:00:00Z',
    is_lead: false,
    state: 'ACTIVE',
    user: { id: `us_${id}`, display_name: name },
  } as TeamMemberResponse
}

function entry(over: Partial<TeamEventEntryResponse> = {}): TeamEventEntryResponse {
  return {
    id: 'te_42ej2s5gh7e8',
    team_id: 'tm_42ej2s5gh7e8',
    event_id: 'ev_gma9hq8a96q5',
    event_title: 'National hackathon',
    entered_at: '2026-01-03T00:00:00Z',
    registered: false,
    registered_count: 0,
    assigned_members: 1,
    roster_size: 2,
    team_size_max: 2,
    roster: [
      {
        id: 'tp_1',
        member_id: 'tb_1',
        assigned: true,
        is_lead: true,
        state: 'ACTIVE',
        registration_status: 'TODO',
        user: { id: 'us_1', display_name: 'Lead person' },
      },
      {
        id: 'tp_2',
        member_id: 'tb_2',
        assigned: true,
        is_lead: false,
        state: 'ACTIVE',
        registration_status: 'TODO',
        user: { id: 'us_2', display_name: 'Second person' },
      },
    ],
    ...over,
  } as TeamEventEntryResponse
}

const candidate = member('3', 'Waiting person')

function renderRoster(over: Partial<TeamEventEntryResponse> = {}) {
  return renderWithProviders(
    <RosterTable
      teamId="tm_42ej2s5gh7e8"
      entry={entry(over)}
      members={[candidate]}
      isLead={true}
    />,
  )
}

beforeAll(async () => {
  await i18n.changeLanguage('en')
})

describe('a lineup that has reached its limit', () => {
  it('says why the candidate cannot be added instead of only greying the button', () => {
    renderRoster()

    expect(screen.getByRole('button', { name: 'Waiting person' })).toBeDisabled()
    expect(screen.getByText(i18n.t('team:rosterFullHint', { max: 2 }))).toBeInTheDocument()
  })

  it('states the reason in text, not only in a hover title a keyboard never reaches', () => {
    renderRoster()

    const reason = screen.getByText(i18n.t('team:rosterFullHint', { max: 2 }))
    expect(reason).toBeVisible()
    expect(reason.tagName).toBe('P')
  })

  it('keeps quiet while the lineup still has room', () => {
    renderRoster({ team_size_max: 5 })

    expect(screen.getByRole('button', { name: 'Waiting person' })).toBeEnabled()
    expect(screen.queryByText(/lineup is already at its limit/i)).not.toBeInTheDocument()
  })

  it('explains the limit in Russian too, not only in the active locale', async () => {
    await i18n.changeLanguage('ru')
    renderRoster()

    expect(screen.getByText(i18n.t('team:rosterFullHint', { max: 2 }))).toBeInTheDocument()

    await i18n.changeLanguage('en')
  })
})
