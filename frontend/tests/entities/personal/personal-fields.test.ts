import { describe, expect, it } from 'vitest'
import { countOf, filled, textOf } from '@/entities/personal/personal-fields'

describe('the server omits an empty personal field rather than sending a blank one', () => {
  it('treats an absent field as empty, not as a value', () => {
    expect(filled(undefined)).toBe(false)
    expect(filled(null)).toBe(false)
    expect(filled('')).toBe(false)
    expect(filled('   ')).toBe(false)
    expect(filled('2026-01-01T00:00:00Z')).toBe(true)
  })

  it('reads an absent text field as the empty string', () => {
    expect(textOf(undefined)).toBe('')
    expect(textOf(null)).toBe('')
    expect(textOf('notes')).toBe('notes')
  })

  it('reads an absent number as zero', () => {
    expect(countOf(undefined)).toBe(0)
    expect(countOf(null)).toBe(0)
    expect(countOf(Number.NaN)).toBe(0)
    expect(countOf(2)).toBe(2)
  })
})
