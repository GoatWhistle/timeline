import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it, vi } from 'vitest'
import { PaletteList } from '@/features/command-palette/palette-list'
import type { PaletteResult } from '@/features/command-palette/palette-results'

const paletteSource = readFileSync(
  resolve(process.cwd(), 'src/features/command-palette/command-palette.tsx'),
  'utf8',
)

const rowSource = readFileSync(
  resolve(process.cwd(), 'src/features/command-palette/palette-row.tsx'),
  'utf8',
)

function results(count: number): PaletteResult[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `r${index}`,
    section: 'events' as const,
    title: `Result ${index}`,
    path: `/events/r${index}`,
  }))
}

describe('the palette keeps its shape whether or not the list scrolls', () => {
  it('reserves room for the scrollbar, so rows never narrow when results arrive', () => {
    expect(paletteSource).toContain('[scrollbar-gutter:stable]')
  })

  it('caps the list so a long result set scrolls instead of stretching the panel', () => {
    expect(paletteSource).toMatch(/max-h-\[[\d.]+rem\][^"]*overflow-y-auto/)
  })

  it('keeps rows tall enough to read rather than shrinking them to fit', () => {
    expect(rowSource).toContain('min-h-12')
    expect(rowSource).not.toContain('h-row-roomy')
  })

  it('brings the selected row into view while arrowing through a long list', () => {
    expect(paletteSource).toContain('scrollIntoView')
    expect(paletteSource).toContain("block: 'nearest'")
  })

  it('renders every result at the same width', () => {
    renderWithProviders(
      <PaletteList results={results(8)} activeId="r0" onHover={vi.fn()} onChoose={vi.fn()} />,
    )
    const rows = Array.from(document.querySelectorAll('[role=option]'))
    expect(rows).toHaveLength(8)
    for (const row of rows) {
      expect(row.className).toContain('w-full')
    }
  })
})

describe('the close control sits level with the search row', () => {
  it('gives the search row a fixed height the close button can centre on', () => {
    expect(paletteSource).toMatch(/className="flex h-14 items-center/)
  })

  it('no longer pads the row instead of sizing it, which left the cross high', () => {
    expect(paletteSource).not.toMatch(
      /className="flex items-center gap-2 border-border border-b px-4 py-3"/,
    )
  })
})
