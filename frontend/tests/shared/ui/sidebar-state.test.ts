import { beforeEach, describe, expect, it } from 'vitest'
import {
  readStoredCollapsed,
  SIDEBAR_STORAGE_KEY,
  sidebarVisibility,
  writeStoredCollapsed,
} from '@/shared/ui/layout/sidebar/sidebar-state'

describe('sidebar persistence', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('starts expanded when nothing was stored', () => {
    expect(readStoredCollapsed()).toBe(false)
  })

  it('remembers a collapsed panel across sessions', () => {
    writeStoredCollapsed(true)
    expect(localStorage.getItem(SIDEBAR_STORAGE_KEY)).toBe('1')
    expect(readStoredCollapsed()).toBe(true)
  })

  it('clears the key rather than storing a falsy value', () => {
    writeStoredCollapsed(true)
    writeStoredCollapsed(false)
    expect(localStorage.getItem(SIDEBAR_STORAGE_KEY)).toBeNull()
    expect(readStoredCollapsed()).toBe(false)
  })

  it('treats a foreign value as expanded rather than throwing', () => {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, 'yes')
    expect(readStoredCollapsed()).toBe(false)
  })
})

describe('sidebarVisibility', () => {
  it('shows the panel whenever it is not collapsed', () => {
    expect(sidebarVisibility(false)).toBe('expanded')
  })

  it('removes a collapsed panel entirely rather than leaving an icon rail', () => {
    expect(sidebarVisibility(true)).toBe('hidden')
  })
})
