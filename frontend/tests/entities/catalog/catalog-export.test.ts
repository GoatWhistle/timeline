import { describe, expect, it } from 'vitest'
import { exportSearch } from '@/entities/catalog/catalog.export'

describe('exportSearch', () => {
  it('carries every active filter and the sort', () => {
    const search = new URLSearchParams(
      exportSearch({
        search: 'ai',
        origin: 'RU',
        kind: 'HACKATHON',
        format: 'ONLINE',
        state: 'UPCOMING',
        from: '2026-10-01T00:00:00.000Z',
        to: '2026-10-31T23:59:59.999Z',
        sort: 'title',
        order: 'desc',
      }),
    )
    expect(search.get('search')).toBe('ai')
    expect(search.get('origin')).toBe('RU')
    expect(search.get('kind')).toBe('HACKATHON')
    expect(search.get('format')).toBe('ONLINE')
    expect(search.get('state')).toBe('UPCOMING')
    expect(search.get('from')).toBe('2026-10-01T00:00:00.000Z')
    expect(search.get('to')).toBe('2026-10-31T23:59:59.999Z')
    expect(search.get('sort')).toBe('title')
    expect(search.get('order')).toBe('desc')
  })

  it('drops pagination so the export covers every match, not one page', () => {
    const search = new URLSearchParams(
      exportSearch({ state: 'UPCOMING', page: 3, page_size: 25 } as never),
    )
    expect(search.has('page')).toBe(false)
    expect(search.has('page_size')).toBe(false)
    expect(search.get('state')).toBe('UPCOMING')
  })

  it('omits empty and undefined filters', () => {
    expect(exportSearch({ search: '', origin: undefined } as never)).toBe('')
  })
})
