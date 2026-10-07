import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { downloadExport } from '@/entities/catalog/catalog.export'
import { ADMIN_DEFAULTS, adminListParams } from '@/features/event-list/admin/admin.params'

const SRC = join(process.cwd(), 'src')

afterEach(() => {
  vi.restoreAllMocks()
})

describe('the admin event list downloads as CSV like the catalog does', () => {
  it('asks the admin export for every event under the list filters, without a page', async () => {
    const calls: string[] = []
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      calls.push(String(input))
      return new Response('id,title\n', {
        status: 200,
        headers: { 'Content-Disposition': 'attachment; filename="events.csv"' },
      })
    })
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:events')
    const saved: string[] = []
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      saved.push(this.download)
    })

    const params = adminListParams(
      { ...ADMIN_DEFAULTS, state: 'UNPUBLISHED', archived: 'true' },
      'agents',
      'title',
      'desc',
      3,
    )
    await downloadExport('/admin/events/export', params)

    const url = new URL(calls[0] ?? '', 'http://localhost')
    expect(url.pathname.endsWith('/admin/events/export')).toBe(true)
    expect(url.searchParams.get('state')).toBe('UNPUBLISHED')
    expect(url.searchParams.get('include_archived')).toBe('true')
    expect(url.searchParams.get('search')).toBe('agents')
    expect(url.searchParams.get('sort')).toBe('title')
    expect(url.searchParams.get('order')).toBe('desc')
    expect(url.searchParams.has('page'), 'the export stopped at one page').toBe(false)
    expect(saved).toEqual(['events.csv'])
  })

  it('puts the download button on the admin toolbar, as on the catalog one', () => {
    const toolbar = readFileSync(join(SRC, 'features/event-list/admin/admin-toolbar.tsx'), 'utf8')
    expect(toolbar).toContain('<CatalogExportButton')
    const list = readFileSync(join(SRC, 'features/event-list/admin/event-list.tsx'), 'utf8')
    expect(list, 'the admin list does not wire the export').toContain('useAdminEventsExport()')
  })
})
