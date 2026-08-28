export const SIDEBAR_STORAGE_KEY = 'timeline-sidebar-collapsed'

export const PEEK_EDGE_PX = 8

export function isCollapsedValue(raw: unknown): boolean {
  return raw === '1'
}

export function readStoredCollapsed(): boolean {
  try {
    return isCollapsedValue(localStorage.getItem(SIDEBAR_STORAGE_KEY))
  } catch {
    return false
  }
}

export function writeStoredCollapsed(collapsed: boolean): void {
  try {
    if (collapsed) localStorage.setItem(SIDEBAR_STORAGE_KEY, '1')
    else localStorage.removeItem(SIDEBAR_STORAGE_KEY)
  } catch {
    return
  }
}

export function isEdgePointer(clientX: number, edge = PEEK_EDGE_PX): boolean {
  return clientX <= edge
}

export type SidebarVisibility = 'expanded' | 'peeking' | 'hidden'

export function sidebarVisibility(collapsed: boolean, peeking: boolean): SidebarVisibility {
  if (!collapsed) return 'expanded'
  return peeking ? 'peeking' : 'hidden'
}
