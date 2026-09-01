import { describe, expect, it } from 'vitest'
import {
  CATALOG_LAYOUTS,
  DEFAULT_CATALOG_ORDER,
  DEFAULT_CATALOG_SORT,
  resolveLayout,
  resolveOrder,
  resolveSort,
} from '@/entities/catalog/catalog.views'

describe('resolveSort', () => {
  it('keeps every whitelisted sort field', () => {
    expect(resolveSort('start_at')).toBe('start_at')
    expect(resolveSort('end_at')).toBe('end_at')
    expect(resolveSort('title')).toBe('title')
  })

  it('falls back to the default for anything else', () => {
    for (const raw of ['', 'prize_pool', 'e.start_at', 'start_at; DROP TABLE events', 'START_AT']) {
      expect(resolveSort(raw)).toBe(DEFAULT_CATALOG_SORT)
    }
  })
})

describe('resolveOrder', () => {
  it('keeps both directions', () => {
    expect(resolveOrder('asc')).toBe('asc')
    expect(resolveOrder('desc')).toBe('desc')
  })

  it('falls back to the default for anything else', () => {
    for (const raw of ['', 'ascending', 'ASC', 'asc; DROP TABLE events']) {
      expect(resolveOrder(raw)).toBe(DEFAULT_CATALOG_ORDER)
    }
  })
})

describe('resolveLayout', () => {
  it('keeps every known layout', () => {
    for (const layout of CATALOG_LAYOUTS) {
      expect(resolveLayout(layout)).toBe(layout)
    }
  })

  it('falls back to the list for anything else', () => {
    expect(resolveLayout('')).toBe('list')
    expect(resolveLayout('carousel')).toBe('list')
  })
})
