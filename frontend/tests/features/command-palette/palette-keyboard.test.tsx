import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CommandPalette } from '@/features/command-palette/command-palette'
import { ShortcutProvider } from '@/shared/keyboard/shortcut-registry'

const navigate = vi.fn()
vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>()
  return { ...actual, useNavigate: () => navigate }
})

const EVENTS = [
  { id: 'ev_1', title: 'Alpha Hackathon', kind: 'HACKATHON' as const },
  { id: 'ev_2', title: 'Bravo Hackathon', kind: 'HACKATHON' as const },
  { id: 'ev_3', title: 'Cairo Hackathon', kind: 'HACKATHON' as const },
]

vi.mock('@/entities/catalog/catalog.queries', () => ({
  catalogQuery: (params: { search?: string; kind?: string }) => ({
    queryKey: ['catalog-keyboard-test', params],
    queryFn: () =>
      Promise.resolve({
        items: EVENTS,
        meta: { page: 1, page_size: 8, total: EVENTS.length, has_next: false },
      }),
  }),
}))

vi.mock('@/entities/team/team.queries', () => ({
  teamsQuery: () => ({
    queryKey: ['teams-keyboard-test'],
    queryFn: () => Promise.resolve({ items: [] }),
  }),
}))

function renderPalette() {
  return renderWithProviders(
    <ShortcutProvider>
      <CommandPalette open onOpenChange={() => {}} commands={[]} isAdmin={false} />
    </ShortcutProvider>,
  )
}

function activeId(): string | null {
  return screen.getByRole('combobox').getAttribute('aria-activedescendant')
}

beforeEach(() => {
  navigate.mockClear()
})

describe('the arrow keys walk the palette results', () => {
  it('lists events on the prefix alone, before any search text is typed', async () => {
    const { user } = renderPalette()
    await user.type(screen.getByRole('combobox'), '#')

    await waitFor(() => expect(screen.getAllByRole('option').length).toBe(EVENTS.length))
  })

  it('moves the selection down instead of snapping back to the first row', async () => {
    const { user } = renderPalette()
    await user.type(screen.getByRole('combobox'), '#')
    await waitFor(() => expect(screen.getAllByRole('option').length).toBe(EVENTS.length))

    const first = activeId()
    await user.keyboard('{ArrowDown}')

    await waitFor(() => expect(activeId()).not.toBe(first))
  })

  it('keeps walking further down the list', async () => {
    const { user } = renderPalette()
    await user.type(screen.getByRole('combobox'), '#')
    await waitFor(() => expect(screen.getAllByRole('option').length).toBe(EVENTS.length))

    await user.keyboard('{ArrowDown}')
    const second = activeId()
    await user.keyboard('{ArrowDown}')

    await waitFor(() => expect(activeId()).not.toBe(second))
  })

  it('comes back up again', async () => {
    const { user } = renderPalette()
    await user.type(screen.getByRole('combobox'), '#')
    await waitFor(() => expect(screen.getAllByRole('option').length).toBe(EVENTS.length))

    const first = activeId()
    await user.keyboard('{ArrowDown}')
    await user.keyboard('{ArrowUp}')

    await waitFor(() => expect(activeId()).toBe(first))
  })

  it('opens the row the arrows landed on', async () => {
    const { user } = renderPalette()
    await user.type(screen.getByRole('combobox'), '#')
    await waitFor(() => expect(screen.getAllByRole('option').length).toBe(EVENTS.length))

    await user.keyboard('{ArrowDown}')
    await user.keyboard('{Enter}')

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/events/ev_2'))
  })
})
