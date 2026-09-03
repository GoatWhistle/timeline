export const SIDEBAR_STORAGE_KEY = 'timeline-sidebar-collapsed'

export const OVERLAY_MAX_WIDTH = 1024

export const OVERLAY_QUERY = `(max-width: ${OVERLAY_MAX_WIDTH - 1}px)`

function isCollapsedValue(raw: unknown): boolean {
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

export type SidebarVisibility = 'expanded' | 'hidden'

export function sidebarVisibility(collapsed: boolean): SidebarVisibility {
  return collapsed ? 'hidden' : 'expanded'
}
