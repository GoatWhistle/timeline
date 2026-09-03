import { useCallback, useMemo, useState } from 'react'
import { catalogEntry } from '@/shared/keyboard/shortcut-catalog'
import { type ShortcutDefinition, useShortcutScope } from '@/shared/keyboard/shortcut-registry'
import {
  readStoredCollapsed,
  type SidebarVisibility,
  sidebarVisibility,
  writeStoredCollapsed,
} from './sidebar-state'

export type SidebarState = {
  collapsed: boolean
  visibility: SidebarVisibility
  toggle: () => void
}

export function useSidebar(): SidebarState {
  const [collapsed, setCollapsed] = useState(readStoredCollapsed)

  const toggle = useCallback(() => {
    setCollapsed((previous) => {
      const next = !previous
      writeStoredCollapsed(next)
      return next
    })
  }, [])

  const shortcuts = useMemo<ShortcutDefinition[]>(
    () => [{ ...catalogEntry('sidebar-toggle'), allowInInput: true, run: toggle }],
    [toggle],
  )

  useShortcutScope('sidebar', shortcuts)

  return {
    collapsed,
    visibility: sidebarVisibility(collapsed),
    toggle,
  }
}
