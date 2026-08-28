import { describe, expect, it } from 'vitest'
import { DEFAULT_FILTERS } from '@/features/burning/model/burning'
import { parseFilters, parseSort } from '@/features/burning/model/use-burning-filters'

describe('parseSort', () => {
  it('reads the start order out of the address', () => {
    expect(parseSort('start')).toBe('start')
  })

  it('falls back to urgency for anything else', () => {
    expect(parseSort('')).toBe('urgency')
    expect(parseSort('urgency')).toBe('urgency')
    expect(parseSort('nonsense')).toBe('urgency')
  })
})

describe('parseFilters', () => {
  it('sorts by urgency and hides closed events with an empty address', () => {
    expect(parseFilters({ sort: '', active: '', action: '' })).toEqual(DEFAULT_FILTERS)
    expect(DEFAULT_FILTERS.sort).toBe('urgency')
    expect(DEFAULT_FILTERS.activeOnly).toBe(true)
  })

  it('turns off the active filter only on an explicit zero', () => {
    expect(parseFilters({ sort: '', active: '0', action: '' }).activeOnly).toBe(false)
    expect(parseFilters({ sort: '', active: '1', action: '' }).activeOnly).toBe(true)
  })

  it('turns on needs action only on an explicit one', () => {
    expect(parseFilters({ sort: '', active: '', action: '1' }).needsAction).toBe(true)
    expect(parseFilters({ sort: '', active: '', action: '0' }).needsAction).toBe(false)
  })

  it('reads every parameter out of one address', () => {
    expect(parseFilters({ sort: 'start', active: '0', action: '1' })).toEqual({
      sort: 'start',
      activeOnly: false,
      needsAction: true,
    })
  })
})
