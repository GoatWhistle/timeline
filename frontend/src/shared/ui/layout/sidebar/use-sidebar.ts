import { useCallback, useEffect, useMemo, useState } from 'react'
import { catalogEntry } from '@/shared/keyboard/shortcut-catalog'
import { type ShortcutDefinition, useShortcutScope } from '@/shared/keyboard/shortcut-registry'
import {
  OVERLAY_QUERY,
  readStoredCollapsed,
  type SidebarVisibility,
  sidebarVisibility,
  writeStoredCollapsed,
} from './sidebar-state'

export type SidebarState = {
  collapsed: boolean
  overlay: boolean
  visibility: SidebarVisibility
  toggle: () => void
  close: () => void
}

function matchesOverlay(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia(OVERLAY_QUERY).matches
}

function useOverlayViewport(): boolean {
  const [overlay, setOverlay] = useState(matchesOverlay)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const media = window.matchMedia(OVERLAY_QUERY)
    const sync = () => {
      setOverlay(media.matches)
    }
    sync()
    media.addEventListener('change', sync)
    return () => {
      media.removeEventListener('change', sync)
    }
  }, [])

  return overlay
}

export function useSidebar(): SidebarState {
  const [stored, setStored] = useState(readStoredCollapsed)
  const [openedOnOverlay, setOpenedOnOverlay] = useState(false)
  const overlay = useOverlayViewport()

  useEffect(() => {
    if (!overlay) setOpenedOnOverlay(false)
  }, [overlay])

  const collapsed = overlay ? !openedOnOverlay : stored

  const toggle = useCallback(() => {
    if (overlay) {
      setOpenedOnOverlay((previous) => !previous)
      return
    }
    setStored((previous) => {
      const next = !previous
      writeStoredCollapsed(next)
      return next
    })
  }, [overlay])

  const close = useCallback(() => {
    if (overlay) {
      setOpenedOnOverlay(false)
      return
    }
    setStored((previous) => {
      if (previous) return previous
      writeStoredCollapsed(true)
      return true
    })
  }, [overlay])

  const shortcuts = useMemo<ShortcutDefinition[]>(
    () => [{ ...catalogEntry('sidebar-toggle'), allowInInput: true, run: toggle }],
    [toggle],
  )

  useShortcutScope('sidebar', shortcuts)

  return {
    collapsed,
    overlay,
    visibility: sidebarVisibility(collapsed),
    toggle,
    close,
  }
}
