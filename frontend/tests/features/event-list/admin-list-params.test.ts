import { describe, expect, it } from 'vitest'
import { ADMIN_DEFAULTS, adminListParams } from '@/features/event-list/admin/admin.params'

function filters(overrides: Partial<typeof ADMIN_DEFAULTS> = {}) {
  return { ...ADMIN_DEFAULTS, ...overrides }
}

describe('the admin list asks the server for what the toolbar shows', () => {
  it('sends the sort the user picked, so the order is the whole list and not one page', () => {
    const params = adminListParams(filters(), '', 'title', 'desc', 1)

    expect(params.sort).toBe('title')
    expect(params.order).toBe('desc')
  })

  it('carries every taxonomy filter the admin endpoint understands', () => {
    const params = adminListParams(
      filters({ state: 'UNPUBLISHED', kind: 'HACKATHON', origin: 'RU', format: 'ONLINE' }),
      '',
      'start_at',
      'asc',
      1,
    )

    expect(params.state).toBe('UNPUBLISHED')
    expect(params.kind).toBe('HACKATHON')
    expect(params.origin).toBe('RU')
    expect(params.format).toBe('ONLINE')
  })

  it('omits a filter that is not set rather than sending an empty string', () => {
    const params = adminListParams(filters(), '', 'start_at', 'asc', 1)

    expect(params.state).toBeUndefined()
    expect(params.kind).toBeUndefined()
    expect(params.origin).toBeUndefined()
    expect(params.format).toBeUndefined()
    expect(params.search).toBeUndefined()
  })

  it('reveals archived events only when the filter asks for them', () => {
    expect(adminListParams(filters(), '', 'start_at', 'asc', 1).include_archived).toBeUndefined()
    expect(
      adminListParams(filters({ archived: 'true' }), '', 'start_at', 'asc', 1).include_archived,
    ).toBe(true)
    expect(
      adminListParams(filters({ archived: 'false' }), '', 'start_at', 'asc', 1).include_archived,
    ).toBeUndefined()
  })

  it('widens a picked day to its whole span, so an event on that day is not missed', () => {
    const params = adminListParams(
      filters({ from: '2026-09-01', to: '2026-09-30' }),
      '',
      'start_at',
      'asc',
      1,
    )

    const from = new Date(params.from ?? '')
    const to = new Date(params.to ?? '')

    expect(Number.isNaN(from.getTime())).toBe(false)
    expect(Number.isNaN(to.getTime())).toBe(false)
    expect(to.getTime() - from.getTime()).toBeGreaterThan(28 * 24 * 60 * 60 * 1000)
  })

  it('sends no period at all when no day is picked', () => {
    const params = adminListParams(filters(), '', 'start_at', 'asc', 1)

    expect(params.from).toBeUndefined()
    expect(params.to).toBeUndefined()
  })

  it('passes the typed search through', () => {
    expect(adminListParams(filters(), 'harbour', 'start_at', 'asc', 1).search).toBe('harbour')
  })
})
