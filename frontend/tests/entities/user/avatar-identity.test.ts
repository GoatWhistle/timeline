import { describe, expect, it } from 'vitest'
import { avatarHue, initials } from '@/entities/user/user-avatar'

describe('avatarHue', () => {
  it('is deterministic for the same id', () => {
    expect(avatarHue('abc-123')).toBe(avatarHue('abc-123'))
  })

  it('stays inside the hue range', () => {
    for (const seed of ['a', 'user-1', 'ffffffff-ffff-ffff-ffff-ffffffffffff', '']) {
      const hue = avatarHue(seed)
      expect(hue).toBeGreaterThanOrEqual(0)
      expect(hue).toBeLessThan(360)
    }
  })

  it('separates different ids', () => {
    expect(avatarHue('user-1')).not.toBe(avatarHue('user-2'))
  })
})

describe('initials', () => {
  it('takes the first letter of a single name', () => {
    expect(initials('Administrator')).toBe('A')
  })

  it('takes first and last for two words', () => {
    expect(initials('Ada Lovelace')).toBe('AL')
  })

  it('skips the middle name', () => {
    expect(initials('Иван Иванович Петров')).toBe('ИП')
  })

  it('uppercases cyrillic correctly', () => {
    expect(initials('анна каренина')).toBe('АК')
  })

  it('falls back when the name is missing', () => {
    expect(initials(null)).toBe('?')
    expect(initials('   ')).toBe('?')
  })

  it('collapses extra whitespace', () => {
    expect(initials('  Ada   Lovelace  ')).toBe('AL')
  })
})
