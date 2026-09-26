import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it } from 'vitest'
import { ResizableTable } from '@/shared/ui/data-display/column-resize/resizable-table'
import { TableBody, TableCell, TableRow } from '@/shared/ui/data-display/table'

const SRC = join(process.cwd(), 'src')

const read = (file: string) => readFileSync(join(SRC, file), 'utf8')

const CATALOG_TABLE = 'features/catalog/catalog-table.tsx'
const ADMIN_TABLE = 'features/event-list/admin/admin-table.tsx'
const SHARED_TABLE = 'shared/ui/data-display/table.tsx'
const RESIZABLE_TABLE = 'shared/ui/data-display/column-resize/resizable-table.tsx'

describe('a row list is drawn on a closed surface, not loose on the page background', () => {
  it('gives the shared table its own bounded surface', () => {
    expect(read(RESIZABLE_TABLE)).toContain('rounded-surface border')
  })

  it('draws the catalog and admin event tables on that same bounded surface', () => {
    for (const file of [CATALOG_TABLE, ADMIN_TABLE]) {
      expect(read(file), `${file} built its own table again`).toContain('<ResizableTable')
      expect(read(file)).not.toContain('<table')
    }
  })
})

describe('a list closes its own bottom edge instead of ending on a dangling divider', () => {
  it('strips the divider from the last row of the shared table body', () => {
    expect(read(SHARED_TABLE)).toContain('[&_tr:last-child]:border-0')
  })

  it('renders that closed edge on the real shared table', () => {
    const { container } = renderWithProviders(
      <ResizableTable
        storageKey="test-widths"
        columns={[{ id: 'only', width: 120 }]}
        flexible="only"
      >
        <TableBody>
          <TableRow>
            <TableCell>only</TableCell>
          </TableRow>
        </TableBody>
      </ResizableTable>,
    )

    const body = container.querySelector('tbody')

    expect(body?.className).toContain('[&_tr:last-child]:border-0')
  })

  it('strips the divider from the last catalog row', () => {
    const source = read(CATALOG_TABLE)
    const at = source.indexOf('<tbody')
    const tbody = source.slice(at, source.indexOf('>', at))

    expect(tbody, `catalog tbody: ${tbody}`).toContain('[&_tr:last-child]:border-0')
  })

  it('strips the divider from the last admin event row', () => {
    const source = read(ADMIN_TABLE)
    const at = source.indexOf('<tbody')
    const tbody = source.slice(at, source.indexOf('>', at))

    expect(tbody, `admin tbody: ${tbody}`).toContain('[&_tr:last-child]:border-0')
  })

  it('keeps drawing the divider on the row itself, so rows stay separated', () => {
    expect(read('entities/event/event-row/event-row.tsx')).toContain('border-b')
  })
})
