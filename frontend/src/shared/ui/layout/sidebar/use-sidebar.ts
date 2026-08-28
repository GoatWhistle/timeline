import { useCallback, useEffect, useMemo, useState } from 'react'
import { type ShortcutDefinition, useShortcutScope } from '@/shared/keyboard/shortcut-registry'
import {
  isEdgePointer,
  readStoredCollapsed,
  type SidebarVisibility,
  sidebarVisibility,
  writeStoredCollapsed,
} from './sidebar-state'

export type SidebarState = {
  collapsed: boolean
  peeking: boolean
  visibility: SidebarVisibility
  toggle: () => void
  setPeeking: (value: boolean) => void
}

export function useSidebar(): SidebarState {
  const [collapsed, setCollapsed] = useState(readStoredCollapsed)
  const [peeking, setPeeking] = useState(false)

  const toggle = useCallback(() => {
    setCollapsed((previous) => {
      const next = !previous
      writeStoredCollapsed(next)
      return next
    })
    setPeeking(false)
  }, [])

  const shortcuts = useMemo<ShortcutDefinition[]>(
    () => [
      {
        id: 'sidebar-toggle',
        keys: ['mod+b'],
        titleKey: 'shortcuts.sidebar',
        group: 'global',
        allowInInput: true,
        run: toggle,
      },
    ],
    [toggle],
  )

  useShortcutScope('sidebar', shortcuts)

  useEffect(() => {
    if (!collapsed) {
      setPeeking(false)
      return
    }

    const onMove = (event: PointerEvent) => {
      if (isEdgePointer(event.clientX)) setPeeking(true)
    }

    document.addEventListener('pointermove', onMove)
    return () => document.removeEventListener('pointermove', onMove)
  }, [collapsed])

  return {
    collapsed,
    peeking,
    visibility: sidebarVisibility(collapsed, peeking),
    toggle,
    setPeeking,
  }
}
