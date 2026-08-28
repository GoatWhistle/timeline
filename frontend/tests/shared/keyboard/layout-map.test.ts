import { describe, expect, it } from 'vitest'
import {
  matchesQuery,
  normalizeForSearch,
  searchVariants,
  toCyrillicLayout,
  toLatinLayout,
} from '@/shared/keyboard/layout-map'

describe('normalizeForSearch', () => {
  it('lowercases cyrillic with the russian locale', () => {
    expect(normalizeForSearch('ХАКАТОН')).toBe('хакатон')
  })

  it('lowercases latin and trims', () => {
    expect(normalizeForSearch('  Schedule ')).toBe('schedule')
  })
})

describe('toCyrillicLayout', () => {
  it('turns a wrong-layout query into the intended russian word', () => {
    expect(toCyrillicLayout('[frfnjy')).toBe('хакатон')
  })

  it('handles a longer phrase', () => {
    expect(toCyrillicLayout('cj,snbt')).toBe('событие')
  })

  it('leaves an already-cyrillic query alone', () => {
    expect(toCyrillicLayout('хакатон')).toBe('хакатон')
  })
})

describe('toLatinLayout', () => {
  it('turns a wrong-layout russian query back into latin', () => {
    expect(toLatinLayout('ысрувгду')).toBe('schedule')
  })

  it('leaves an already-latin query alone', () => {
    expect(toLatinLayout('schedule')).toBe('schedule')
  })
})

describe('searchVariants', () => {
  it('returns nothing for an empty query', () => {
    expect(searchVariants('   ')).toEqual([])
  })

  it('includes the literal query and both layout readings', () => {
    expect(searchVariants('[frfnjy')).toContain('хакатон')
    expect(searchVariants('[frfnjy')).toContain('[frfnjy')
  })

  it('does not repeat identical variants', () => {
    const variants = searchVariants('123')
    expect(new Set(variants).size).toBe(variants.length)
  })
})

describe('matchesQuery', () => {
  it('matches a russian label typed in the latin layout', () => {
    expect(matchesQuery('Хакатоны', '[frfnjy')).toBe(true)
  })

  it('matches a russian label typed in russian', () => {
    expect(matchesQuery('Хакатоны', 'хакат')).toBe(true)
  })

  it('matches an english label typed in the russian layout', () => {
    expect(matchesQuery('Schedule', 'ысрувгду')).toBe(true)
  })

  it('matches case-insensitively', () => {
    expect(matchesQuery('Расписание', 'РАСПИС')).toBe(true)
  })

  it('rejects a query that matches nothing', () => {
    expect(matchesQuery('Профиль', 'zzzz')).toBe(false)
  })

  it('rejects an empty haystack', () => {
    expect(matchesQuery('', 'a')).toBe(false)
  })
})
