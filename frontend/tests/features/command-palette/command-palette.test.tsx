import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CommandPalette } from '@/features/command-palette/command-palette'
import { i18n } from '@/shared/i18n/config'
import { ShortcutProvider } from '@/shared/keyboard/shortcut-registry'

const navigate = vi.fn()
vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>()
  return { ...actual, useNavigate: () => navigate }
})

let catalogItems: { id: string; title: string; kind: 'HACKATHON' | 'MEETUP' }[] = []
vi.mock('@/entities/catalog/catalog.queries', () => ({
  catalogQuery: (params: { search?: string; kind?: string }) => ({
    queryKey: ['catalog-test', params],
    queryFn: () =>
      Promise.resolve({
        items: catalogItems.filter((item) => !params.kind || item.kind === params.kind),
        meta: { page: 1, page_size: 8, total: catalogItems.length, has_next: false },
      }),
  }),
}))

let teamItems: { id: string; name: string }[] = []
vi.mock('@/entities/team/team.queries', () => ({
  teamsQuery: () => ({
    queryKey: ['teams-test'],
    queryFn: () => Promise.resolve({ items: teamItems }),
  }),
}))

function renderPalette({ isAdmin = false }: { isAdmin?: boolean } = {}) {
  return renderWithProviders(
    <ShortcutProvider>
      <CommandPalette open onOpenChange={() => {}} commands={[]} isAdmin={isAdmin} />
    </ShortcutProvider>,
  )
}

beforeEach(() => {
  localStorage.clear()
  navigate.mockClear()
  catalogItems = []
  teamItems = []
})

describe('CommandPalette', () => {
  it('opens with the input focused and no prefix active', () => {
    renderPalette()
    expect(screen.getByRole('combobox')).toHaveFocus()
  })

  it('shows recent entries with an empty query', async () => {
    localStorage.setItem(
      'timeline-palette-recent',
      JSON.stringify([{ id: 'ev_1', title: 'Timeline Hack', path: '/events/ev_1' }]),
    )
    renderPalette()
    expect(await screen.findByText('Timeline Hack')).toBeInTheDocument()
  })

  it('opens the prefix help on a bare question mark', async () => {
    const { user } = renderPalette()
    await user.type(screen.getByRole('combobox'), '?')
    expect(
      await screen.findByText(i18n.t('common:palette.help.prefixHackathons')),
    ).toBeInTheDocument()
  })

  it('searches hackathons under the # prefix', async () => {
    catalogItems = [{ id: 'ev_1', title: 'Timeline Hack', kind: 'HACKATHON' }]
    const { user } = renderPalette()
    await user.type(screen.getByRole('combobox'), '#Timeline')
    expect(await screen.findByText('Timeline Hack')).toBeInTheDocument()
  })

  it('does not show meetups under the hackathon prefix', async () => {
    catalogItems = [{ id: 'ev_2', title: 'Coffee meetup', kind: 'MEETUP' }]
    const { user } = renderPalette()
    await user.type(screen.getByRole('combobox'), '#coffee')
    await waitFor(() => {
      expect(screen.queryByText('Coffee meetup')).not.toBeInTheDocument()
    })
  })

  it('lists the caller teams under the ~ prefix', async () => {
    teamItems = [{ id: 'tm_1', name: 'Rocket Goats' }]
    const { user } = renderPalette()
    await user.type(screen.getByRole('combobox'), '~')
    expect(await screen.findByText('Rocket Goats')).toBeInTheDocument()
  })

  it('shows nothing under the admin prefix for a non-admin', async () => {
    const { user } = renderPalette({ isAdmin: false })
    await user.type(screen.getByRole('combobox'), '!')
    expect(await screen.findByText(i18n.t('common:palette.empty'))).toBeInTheDocument()
  })

  it('shows admin pages under the admin prefix for an admin', async () => {
    const { user } = renderPalette({ isAdmin: true })
    await user.type(screen.getByRole('combobox'), '!')
    expect(await screen.findByText(i18n.t('common:nav.adminUsers'))).toBeInTheDocument()
  })

  it('navigates and records a recent entry when a page is chosen', async () => {
    const { user } = renderPalette()
    await user.type(screen.getByRole('combobox'), '/schedule')
    const option = await screen.findByRole('option', {
      name: new RegExp(i18n.t('common:nav.schedule')),
    })
    await user.click(option)

    expect(navigate).toHaveBeenCalledWith('/schedule')
    expect(localStorage.getItem('timeline-palette-recent')).toContain('/schedule')
  })

  it('runs a command instead of navigating when the result is a command', async () => {
    const run = vi.fn()
    const { user } = renderWithProviders(
      <ShortcutProvider>
        <CommandPalette
          open
          onOpenChange={() => {}}
          commands={[{ id: 'cmd-1', section: 'commands', title: 'Do the thing', run }]}
          isAdmin={false}
        />
      </ShortcutProvider>,
    )
    await user.type(screen.getByRole('combobox'), '>thing')
    await user.click(await screen.findByRole('option', { name: /do the thing/i }))
    expect(run).toHaveBeenCalledOnce()
    expect(navigate).not.toHaveBeenCalled()
  })
})
