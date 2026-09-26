import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = join(process.cwd(), 'src')

const read = (file: string) => readFileSync(join(SRC, file), 'utf8')

const TABLES = ['shared/ui/data-display/column-resize/resizable-table.tsx']

const ROW_FILES = [
  'entities/catalog/catalog-table-row.tsx',
  'features/event-list/admin/admin-table-row.tsx',
  'features/user-list/user-table.tsx',
]

describe('every page is drawn on one frame, whichever layout it uses', () => {
  it('pads the scrolling layout to the same gutter as a list pane', () => {
    const source = read('app/layouts/scroll-page/scroll-page.tsx')

    expect(source, 'a wider gutter here sets those pages 8px off every list page').toContain('p-4')
    expect(source).not.toContain('p-6')
  })

  it('gives every table header the one row height, not a hand-picked one', () => {
    expect(read('shared/ui/data-display/table.tsx')).toContain('h-row px-3')

    for (const file of TABLES) {
      expect(read(file), `${file} must use the shared header height`).toContain('h-row px-3')
    }
  })

  it('holds every body row to the same floor, so lists do not jitter between pages', () => {
    expect(read('shared/ui/data-display/table.tsx')).toContain('h-row-roomy')

    for (const file of ROW_FILES) {
      expect(read(file), `${file} must hold the shared row floor`).toContain('h-row-roomy')
    }
  })

  it('states both row heights as tokens, so one edit moves every table', () => {
    const tokens = read('styles/tokens/typography.css')

    expect(tokens).toContain('--row-height:')
    expect(tokens).toContain('--row-height-roomy:')
  })
})
