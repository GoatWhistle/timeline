import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it, vi } from 'vitest'
import { i18n } from '@/shared/i18n/config'

let items: Record<string, unknown>[] = []

vi.mock('@/entities/team/team.queries', async () => {
  const { queryOptions } = await import('@tanstack/react-query')
  return {
    teamsQuery: () =>
      queryOptions({
        queryKey: ['teams', items.length],
        queryFn: () => ({ items }),
        retry: false,
      }),
    useCreateTeam: () => ({ mutateAsync: async () => ({}), isPending: false }),
  }
})

const { TeamsPage } = await import('@/features/teams/teams')

function createButtons(): HTMLElement[] {
  return screen.queryAllByRole('button', { name: new RegExp(i18n.t('team:create')) })
}

describe('the teams page offers creating a team once, not twice', () => {
  it('puts the only call to action in the empty pane when there are no teams', async () => {
    items = []
    renderWithProviders(<TeamsPage />)

    await screen.findByText(i18n.t('team:empty'))
    expect(createButtons()).toHaveLength(1)
  })

  it('keeps the header action once teams exist, because there is no empty pane then', async () => {
    items = [
      {
        id: 'tm_42ej2s5gh7e8',
        name: 'Backend crew',
        is_lead: true,
        lead: { id: 'us_42ej2s5gh7e8', display_name: 'Alice Ivanova' },
        member_count: 3,
      },
    ]
    renderWithProviders(<TeamsPage />)

    await screen.findByText('Backend crew')
    expect(createButtons()).toHaveLength(1)
  })
})
