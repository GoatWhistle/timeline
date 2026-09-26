import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it } from 'vitest'
import { SortIcon } from '@/shared/ui/data-display/sort-icon'

const SRC = join(process.cwd(), 'src')

const read = (file: string) => readFileSync(join(SRC, file), 'utf8')

const TABLES = ['shared/ui/data-display/column-resize/resizable-table.tsx']

const LIST_PAGES = [
  'features/catalog/catalog.tsx',
  'features/event-list/admin/event-list.tsx',
  'features/user-list/user-list.tsx',
]

const ORDER_BUTTONS = [
  'features/catalog/catalog-sort-control.tsx',
  'features/catalog/catalog-toolbar-phone.tsx',
]

function glyphs(active: boolean, order: 'asc' | 'desc') {
  const view = renderWithProviders(<SortIcon active={active} order={order} />)
  const found = [...document.querySelectorAll('[data-sort-icon] svg')].map(
    (svg) => svg.getAttribute('class') ?? '',
  )
  view.unmount()
  return found
}

describe('the sort arrow turns instead of being swapped for another glyph', () => {
  it('states both ends of the turn, because rotate cannot tween from none', () => {
    const source = read('shared/ui/data-display/sort-icon.tsx')
    expect(source, 'a missing zero end makes the arrow jump instead of turning').toContain(
      'rotate-0',
    )
    expect(source).toContain('rotate-180')
  })

  it('gates the turn and the fade on reduced motion, because they move a thing', () => {
    const source = read('shared/ui/data-display/sort-icon.tsx')
    expect(source).toContain('motion-safe:transition-[opacity,scale,rotate]')
    expect(source).toContain('motion-safe:transition-transform')
  })

  it('keeps both glyphs mounted, so the first sort fades the arrow in instead of swapping', () => {
    const idle = glyphs(false, 'asc')
    const sorted = glyphs(true, 'desc')

    expect(idle, 'the arrow is only created on the first sort').toHaveLength(2)
    expect(sorted).toHaveLength(2)
    expect(idle[1]).toContain('arrow-up')
    expect(idle[1]).toContain('opacity-0')
    expect(sorted[1]).toContain('opacity-100')
    expect(sorted[1]).toContain('rotate-180')
    expect(sorted[0], 'the idle glyph still shows over the arrow').toContain('opacity-0')
  })

  it('is the only sort arrow in the tree, so every table turns the same way', () => {
    for (const file of TABLES) {
      const source = read(file)
      expect(source, `${file} must use the shared arrow`).toContain(
        "from '@/shared/ui/data-display/sort-icon'",
      )
      expect(source, `${file} still declares its own arrow`).not.toMatch(/function SortIcon\b/)
    }
  })

  it('turns the same arrow in the tile order buttons instead of swapping two glyphs', () => {
    for (const file of ORDER_BUTTONS) {
      const source = read(file)
      expect(source, `${file} swaps glyphs again`).not.toMatch(/\bArrowDown\b/)
      expect(source).toContain('<SortArrow')
    }
  })

  it('keeps the table on screen while a new sort loads, or the header is rebuilt mid-turn', () => {
    for (const file of LIST_PAGES) {
      expect(read(file), file).toContain('placeholderData: keepPreviousData')
    }
  })
})
