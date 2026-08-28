import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SECTION,
  resolveSection,
  SETTINGS_SECTIONS,
} from '@/features/settings-overlay/sections'

describe('resolveSection', () => {
  it('accepts every declared section id', () => {
    for (const section of SETTINGS_SECTIONS) {
      expect(resolveSection(section.id)).toBe(section.id)
    }
  })

  it('falls back to the default for an unknown value', () => {
    expect(resolveSection('nonsense')).toBe(DEFAULT_SECTION)
  })

  it('falls back to the default when the parameter is absent', () => {
    expect(resolveSection(null)).toBe(DEFAULT_SECTION)
  })

  it('exposes appearance, where theme and language live', () => {
    expect(SETTINGS_SECTIONS.map((section) => section.id)).toContain('appearance')
  })
})
