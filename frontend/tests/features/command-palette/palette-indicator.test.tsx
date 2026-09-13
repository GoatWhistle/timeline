import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it, vi } from 'vitest'
import { PaletteList } from '@/features/command-palette/palette-list'
import type { PaletteResult } from '@/features/command-palette/palette-results'

const RESULTS: PaletteResult[] = [
  { id: 'a', section: 'events', title: 'Alpha', path: '/events/a' },
  { id: 'b', section: 'events', title: 'Bravo', path: '/events/b' },
]

function renderList(activeId: string) {
  return renderWithProviders(
    <PaletteList results={RESULTS} activeId={activeId} onHover={vi.fn()} onChoose={vi.fn()} />,
  )
}

describe('the palette moves its highlight the way the sidebar does', () => {
  it('draws one sliding indicator rather than colouring the row itself', async () => {
    renderList('a')
    await waitFor(() => expect(document.querySelector('[data-indicator]')).not.toBeNull())
  })

  it('marks the active row for the indicator to follow', () => {
    renderList('b')
    const active = document.querySelector('[data-indicator-active="true"]')
    expect(active?.textContent).toContain('Bravo')
  })

  it('moves that mark when the selection changes', () => {
    const { unmount } = renderList('a')
    expect(document.querySelector('[data-indicator-active="true"]')?.textContent).toContain('Alpha')
    unmount()

    renderList('b')
    expect(document.querySelector('[data-indicator-active="true"]')?.textContent).toContain('Bravo')
  })

  it('never paints a second highlight on the active row', () => {
    renderList('a')
    const active = screen.getByRole('option', { name: /Alpha/ })
    expect(active.className).not.toContain('bg-accent-surface')
  })

  it('gives every row the indicator hook, so none is skipped', () => {
    renderList('a')
    expect(document.querySelectorAll('[data-indicator-item]')).toHaveLength(RESULTS.length)
  })
})
