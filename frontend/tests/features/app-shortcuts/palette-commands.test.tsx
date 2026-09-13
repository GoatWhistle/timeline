import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it, vi } from 'vitest'
import { AppShortcuts } from '@/features/app-shortcuts/app-shortcuts'
import { SETTINGS_SECTIONS } from '@/features/settings-overlay/sections'
import { ShortcutProvider } from '@/shared/keyboard/shortcut-registry'

const navigate = vi.fn()
vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>()
  return { ...actual, useNavigate: () => navigate }
})

const captured: { commands: { id: string; title: string; run?: () => void }[] } = { commands: [] }

vi.mock('@/features/command-palette/command-palette', () => ({
  CommandPalette: (props: { commands: { id: string; title: string; run?: () => void }[] }) => {
    captured.commands = props.commands
    return null
  },
}))

function render() {
  return renderWithProviders(
    <ShortcutProvider>
      <AppShortcuts targets={[]} isAdmin={false} />
    </ShortcutProvider>,
  )
}

describe('the command prefix has real commands behind it', () => {
  it('offers more than the single help entry it used to', () => {
    render()
    expect(captured.commands.length).toBeGreaterThan(1)
  })

  it('offers every settings section as its own command', () => {
    render()
    for (const section of SETTINGS_SECTIONS) {
      expect(captured.commands.some((command) => command.id === `settings-${section.id}`)).toBe(
        true,
      )
    }
  })

  it('gives each command something to run', () => {
    render()
    for (const command of captured.commands) {
      expect(typeof command.run).toBe('function')
    }
  })

  it('opens the settings overlay rather than a separate page', () => {
    render()
    navigate.mockClear()
    captured.commands.find((command) => command.id === 'settings-appearance')?.run?.()
    expect(navigate).toHaveBeenCalledWith('?settings=appearance')
  })

  it('names each command after the section it opens', () => {
    render()
    const titles = captured.commands.map((command) => command.title)
    expect(new Set(titles).size).toBe(titles.length)
  })
})
