import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it } from 'vitest'
import { SortIcon } from '@/shared/ui/data-display/sort-icon'

const SRC = join(process.cwd(), 'src')

const TABLES = [
  'features/catalog/catalog-table.tsx',
  'features/event-list/admin/admin-table.tsx',
  'features/user-list/user-table.tsx',
]

describe('the sort arrow turns instead of being swapped for another glyph', () => {
  it('states both ends of the turn, because rotate cannot tween from none', () => {
    const source = readFileSync(join(SRC, 'shared/ui/data-display/sort-icon.tsx'), 'utf8')

    expect(source, 'a missing zero end makes the arrow jump instead of turning').toContain(
      'rotate-0',
    )
    expect(source).toContain('rotate-180')
  })

  it('gates the turn on reduced motion, because it moves a thing rather than recolouring it', () => {
    const source = readFileSync(join(SRC, 'shared/ui/data-display/sort-icon.tsx'), 'utf8')

    expect(source).toContain('motion-safe:transition-transform')
  })

  it('draws one arrow for both directions, so the element survives the toggle', () => {
    const ascending = renderWithProviders(<SortIcon active order="asc" />)
    const ascendingIcon = document.querySelector('svg')?.getAttribute('class') ?? ''
    ascending.unmount()

    const descending = renderWithProviders(<SortIcon active order="desc" />)
    const descendingIcon = document.querySelector('svg')?.getAttribute('class') ?? ''
    descending.unmount()

    expect(ascendingIcon).toContain('arrow-up')
    expect(descendingIcon, 'a second glyph would replace the node and kill the turn').toContain(
      'arrow-up',
    )
    expect(ascendingIcon).toContain('rotate-0')
    expect(descendingIcon).toContain('rotate-180')
  })

  it('is the only sort arrow in the tree, so every table turns the same way', () => {
    for (const file of TABLES) {
      const source = readFileSync(join(SRC, file), 'utf8')

      expect(source, `${file} must use the shared arrow`).toContain(
        "from '@/shared/ui/data-display/sort-icon'",
      )
      expect(source, `${file} still declares its own arrow`).not.toMatch(/function SortIcon\b/)
    }
  })
})
