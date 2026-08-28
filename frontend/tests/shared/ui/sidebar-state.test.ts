import { beforeEach, describe, expect, it } from 'vitest'
import {
  isEdgePointer,
  PEEK_EDGE_PX,
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

describe('edge peek', () => {
  it('answers to a pointer on the very left edge', () => {
    expect(isEdgePointer(0)).toBe(true)
    expect(isEdgePointer(PEEK_EDGE_PX)).toBe(true)
  })

  it('ignores a pointer past the edge strip', () => {
    expect(isEdgePointer(PEEK_EDGE_PX + 1)).toBe(false)
    expect(isEdgePointer(400)).toBe(false)
  })
})

describe('sidebarVisibility', () => {
  it('shows the panel whenever it is not collapsed', () => {
    expect(sidebarVisibility(false, false)).toBe('expanded')
    expect(sidebarVisibility(false, true)).toBe('expanded')
  })

  it('removes a collapsed panel entirely rather than leaving an icon rail', () => {
    expect(sidebarVisibility(true, false)).toBe('hidden')
  })

  it('brings a collapsed panel back temporarily on a peek', () => {
    expect(sidebarVisibility(true, true)).toBe('peeking')
  })
})
