import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { i18n } from '@/shared/i18n/config'

const enterMutate = vi.fn()

type Row = { id: string; title: string; state: string }

const state = {
  catalog: { items: [] as Row[] },
  entered: { items: [] as { event_id: string }[] },
}

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return {
    ...actual,
    useQuery: (options: { queryKey: unknown[] }) =>
      options.queryKey[0] === 'team-events'
        ? { data: state.entered }
        : { data: state.catalog, isPending: false, isFetching: false, isError: false },
  }
})

vi.mock('@/entities/catalog/catalog.queries', () => ({
  catalogQuery: () => ({ queryKey: ['catalog'] }),
}))

vi.mock('@/entities/team/team.queries', () => ({
  teamEventsQuery: (teamId: string) => ({ queryKey: ['team-events', teamId] }),
  useEnterEvent: () => ({ mutateAsync: enterMutate, isPending: false }),
}))

const { EnterEventDialog } = await import('@/features/teams/enter-event-dialog')

const FINISHED = { id: 'ev_finished000', title: 'Last summer hackathon', state: 'FINISHED' }
const UPCOMING = { id: 'ev_upcoming000', title: 'Autumn hackathon', state: 'UPCOMING' }
const ACTIVE = { id: 'ev_active00000', title: 'Running hackathon', state: 'ACTIVE' }

function renderDialog() {
  return renderWithProviders(
    <EnterEventDialog teamId="tm_42ej2s5gh7e8" open onOpenChange={vi.fn()} />,
  )
}

describe('a team is not offered a hackathon that has already finished', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en')
  })

  beforeEach(() => {
    enterMutate.mockReset()
    state.catalog = { items: [FINISHED, UPCOMING, ACTIVE] }
    state.entered = { items: [] }
  })

  it('leaves the finished hackathon out of the list entirely', () => {
    renderDialog()
    expect(screen.queryByRole('button', { name: new RegExp(FINISHED.title) })).toBeNull()
  })

  it('still offers a hackathon that has not started', () => {
    renderDialog()
    expect(screen.getByRole('button', { name: new RegExp(UPCOMING.title) })).toBeTruthy()
  })

  it('still offers a hackathon that is running', () => {
    renderDialog()
    expect(screen.getByRole('button', { name: new RegExp(ACTIVE.title) })).toBeTruthy()
  })

  it('says the list is empty when every hackathon has finished', () => {
    state.catalog = { items: [FINISHED] }
    renderDialog()
    expect(screen.getByText(i18n.t('team:enterNoneOpen'))).toBeTruthy()
  })
})
