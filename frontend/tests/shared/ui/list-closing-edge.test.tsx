import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it } from 'vitest'
import { Table, TableBody, TableCell, TableRow } from '@/shared/ui/data-display/table'

const SRC = join(process.cwd(), 'src')

const read = (file: string) => readFileSync(join(SRC, file), 'utf8')

const CATALOG_TABLE = 'features/catalog/catalog-table.tsx'
const ADMIN_TABLE = 'features/event-list/admin/admin-table.tsx'
const SHARED_TABLE = 'shared/ui/data-display/table.tsx'

function surfaceOf(source: string, anchor: string): string {
  const at = source.indexOf(anchor)
  if (at < 0) return ''
  const open = source.lastIndexOf('<div', at)
  return source.slice(open, at)
}

describe('a row list is drawn on a closed surface, not loose on the page background', () => {
  it('gives the shared table its own bounded surface', () => {
    expect(read(SHARED_TABLE)).toContain('rounded-surface border')
  })

  it('bounds the catalog table the same way the shared table is bounded', () => {
    const source = read(CATALOG_TABLE)
    const surface = surfaceOf(source, '<table')

    expect(surface, `catalog table wrapper: ${surface}`).toContain('rounded-surface')
    expect(surface, `catalog table wrapper: ${surface}`).toContain('border')
  })

  it('bounds the admin event table the same way', () => {
    const source = read(ADMIN_TABLE)
    const wrapper = surfaceOf(source, '<table')

    expect(wrapper, `admin table surface: ${wrapper}`).toContain('rounded-surface border')
    expect(wrapper, `listbox wrapper: ${wrapper}`).toContain('border')
  })
})

describe('a list closes its own bottom edge instead of ending on a dangling divider', () => {
  it('strips the divider from the last row of the shared table body', () => {
    expect(read(SHARED_TABLE)).toContain('[&_tr:last-child]:border-0')
  })

  it('renders that closed edge on the real shared table', () => {
    const { container } = renderWithProviders(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>only</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
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
