import { beforeEach, describe, expect, it } from 'vitest'
import {
  applyTheme,
  DEFAULT_THEME_PREFERENCE,
  isThemePreference,
  readStoredTheme,
  resolveTheme,
  THEME_STORAGE_KEY,
  writeStoredTheme,
} from '@/shared/theme/theme'

describe('theme preference', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.className = ''
  })

  it('defaults to system', () => {
    expect(DEFAULT_THEME_PREFERENCE).toBe('system')
    expect(readStoredTheme()).toBeNull()
  })

  it('recognises only the three known states', () => {
    expect(isThemePreference('light')).toBe(true)
    expect(isThemePreference('dark')).toBe(true)
    expect(isThemePreference('system')).toBe(true)
    expect(isThemePreference('sepia')).toBe(false)
  })

  it('ignores a corrupted stored value', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'sepia')
    expect(readStoredTheme()).toBeNull()
  })

  it('persists and reads back the choice', () => {
    writeStoredTheme('dark')
    expect(readStoredTheme()).toBe('dark')
  })

  it('an explicit choice resolves to itself', () => {
    expect(resolveTheme('light')).toBe('light')
    expect(resolveTheme('dark')).toBe('dark')
  })

  it('sets the class and color-scheme on the root element', () => {
    applyTheme('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.documentElement.style.colorScheme).toBe('dark')

    applyTheme('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(document.documentElement.style.colorScheme).toBe('light')
  })
})
