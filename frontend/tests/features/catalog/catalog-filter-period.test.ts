import { describe, expect, it } from 'vitest'
import {
  ADMIN_FILTER_FIELDS,
  activeFilterCount,
  CATALOG_FILTER_FIELDS,
  clearedRow,
  rowActive,
  rowFieldsOf,
} from '@/features/catalog/catalog-filter-conditions'

describe('the two date bounds are one filter, the way an event has one period', () => {
  it('offers a single dates row in place of separate start and end fields', () => {
    for (const fields of [CATALOG_FILTER_FIELDS, ADMIN_FILTER_FIELDS]) {
      const rows = rowFieldsOf(fields)
      expect(rows.filter((row) => row === 'period')).toHaveLength(1)
      expect(rows, 'a bare date bound came back as its own row').not.toEqual(
        expect.arrayContaining(['from']),
      )
      expect(rows).not.toEqual(expect.arrayContaining(['to']))
    }
  })

  it('counts a range once, however many of its ends are set', () => {
    expect(activeFilterCount({ from: '2026-09-01', to: '2026-09-30' })).toBe(1)
    expect(activeFilterCount({ from: '2026-09-01' })).toBe(1)
    expect(activeFilterCount({ to: '2026-09-30', kind: 'HACKATHON' })).toBe(2)
  })

  it('treats either end as setting the range, and clears both ends together', () => {
    expect(rowActive({ to: '2026-09-30' }, 'period')).toBe(true)
    expect(rowActive({}, 'period')).toBe(false)
    expect(clearedRow('period')).toEqual({ from: '', to: '' })
  })
})
