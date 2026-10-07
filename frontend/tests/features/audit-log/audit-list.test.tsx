import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fireEvent, screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import {
  AUDIT_DEFAULTS,
  auditParams,
  nextAuditSort,
  resolveAuditOrder,
  resolveAuditSort,
} from '@/features/audit-log/audit.params'
import { AuditTable } from '@/features/audit-log/audit-table'
import type { AuditResponse } from '@/shared/api/types.gen'
import { i18n, i18nReady } from '@/shared/i18n/config'

beforeAll(async () => {
  await i18nReady
  await i18n.changeLanguage('en')
})

const SRC = join(process.cwd(), 'src')

const item = {
  id: '1',
  created_at: '2026-10-07T09:30:00Z',
  actor_user_id: 'us_aaaaaaaaaaaa',
  actor_email: 'admin@example.com',
  action: 'EVENT_PUBLISH',
  entity_type: 'EVENT',
  entity_id: '00000000-0000-0000-0000-000000000001',
  request_id: 'req-1',
} as unknown as AuditResponse

describe('the audit log reads and sorts like the other admin lists', () => {
  it('lists the newest records first until the reader picks another order', () => {
    expect(resolveAuditSort('')).toBe('created_at')
    expect(resolveAuditOrder('')).toBe('desc')
    expect(resolveAuditSort('nonsense')).toBe('created_at')
    expect(auditParams(AUDIT_DEFAULTS, '', 1)).toMatchObject({ sort: 'created_at', order: 'desc' })
  })

  it('flips the direction on a second click and starts a new column from its natural end', () => {
    expect(nextAuditSort('created_at', 'desc', 'created_at')).toEqual({
      sort: 'created_at',
      order: 'asc',
    })
    expect(nextAuditSort('created_at', 'desc', 'actor')).toEqual({ sort: 'actor', order: 'asc' })
    expect(nextAuditSort('actor', 'asc', 'created_at')).toEqual({
      sort: 'created_at',
      order: 'desc',
    })
  })

  it('passes the search, the filters and the period to the server', () => {
    const params = auditParams(
      { ...AUDIT_DEFAULTS, action: 'EVENT_PUBLISH', entity: 'EVENT', from: '2026-10-01' },
      'admin',
      2,
    )
    expect(params).toMatchObject({
      page: 2,
      search: 'admin',
      action: 'EVENT_PUBLISH',
      entity_type: 'EVENT',
    })
    expect(params.from).toMatch(/^2026-(09-30|10-01)T/)
    expect(params).not.toHaveProperty('to')
  })

  it('sorts from the time, who, action and entity headers, never from changes', () => {
    const onSort = vi.fn()
    renderWithProviders(
      <AuditTable items={[item]} sort="created_at" order="desc" onSort={onSort} onOpen={vi.fn()} />,
    )
    for (const [label, sort] of [
      ['Time', 'created_at'],
      ['Who', 'actor'],
      ['Action', 'action'],
      ['Entity', 'entity_type'],
    ] as const) {
      fireEvent.click(screen.getByRole('button', { name: label }))
      expect(onSort).toHaveBeenLastCalledWith(sort)
    }
    expect(screen.getByRole('columnheader', { name: /Time/ })).toHaveAttribute(
      'aria-sort',
      'descending',
    )
    expect(screen.queryByRole('button', { name: 'Changes' })).toBeNull()
  })

  it('opens a record by clicking its row', () => {
    const onOpen = vi.fn()
    const { container } = renderWithProviders(
      <AuditTable items={[item]} sort="created_at" order="desc" onSort={vi.fn()} onOpen={onOpen} />,
    )
    fireEvent.click(container.querySelector('[data-audit-row]') as HTMLElement)
    expect(onOpen).toHaveBeenCalledWith(item)
  })

  it('heads the page with the list bar: search, filters and the download beside them', () => {
    const page = readFileSync(join(SRC, 'features/audit-log/audit-log.tsx'), 'utf8')
    expect(page).toContain('<ListToolbar')
    expect(page).not.toContain('<PageHeader')
    expect(page).toContain('<AuditFiltersPopover')
    expect(page).toContain('<CatalogExportButton')
    expect(page).toContain("useListExport<AuditParamsShape>('/admin/audit/export')")
    expect(page, 'the old row of selects came back').not.toContain('<SelectTrigger')
  })
})
