import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { i18n } from '@/shared/i18n/config'

const enterMutate = vi.fn()

const state = {
  catalog: { items: [] as { id: string; title: string }[] },
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

const ENTERED = { id: 'ev_entered000', title: 'Entered hackathon' }
const FREE = { id: 'ev_free000000', title: 'Open hackathon' }

function renderDialog() {
  return renderWithProviders(
    <EnterEventDialog teamId="tm_42ej2s5gh7e8" open onOpenChange={vi.fn()} />,
  )
}

describe('a hackathon the team already entered is not offered again', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en')
  })

  beforeEach(() => {
    enterMutate.mockReset()
    state.catalog = { items: [ENTERED, FREE] }
    state.entered = { items: [{ event_id: ENTERED.id }] }
  })

  it('marks the entered hackathon as unavailable, naming that hackathon', () => {
    renderDialog()
    const option = screen.getByRole('button', { name: /Entered hackathon/ })
    expect(option).toHaveAttribute('aria-disabled', 'true')
  })

  it('leaves a hackathon the team has not entered choosable', () => {
    renderDialog()
    const option = screen.getByRole('button', { name: /Open hackathon/ })
    expect(option).not.toHaveAttribute('aria-disabled')
  })

  it('does not enter the hackathon again when its row is activated', async () => {
    const { user } = renderDialog()
    await user.click(screen.getByRole('button', { name: /Entered hackathon/ }))
    expect(enterMutate).not.toHaveBeenCalled()
  })

  it('still enters a hackathon the team has not entered', async () => {
    const { user } = renderDialog()
    await user.click(screen.getByRole('button', { name: /Open hackathon/ }))
    expect(enterMutate).toHaveBeenCalledWith({ event_id: FREE.id })
  })

  it('keeps the unavailable row focusable, so it is reachable by keyboard', () => {
    renderDialog()
    const option = screen.getByRole('button', { name: /Entered hackathon/ })
    expect(option).not.toBeDisabled()
    option.focus()
    expect(option).toHaveFocus()
  })

  it('offers every hackathon when the team has entered none', () => {
    state.entered = { items: [] }
    renderDialog()
    for (const title of [ENTERED.title, FREE.title]) {
      expect(screen.getByRole('button', { name: new RegExp(title) })).not.toHaveAttribute(
        'aria-disabled',
      )
    }
  })
})
