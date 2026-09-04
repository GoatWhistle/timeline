import { useCallback, useEffect, useLayoutEffect, useState } from 'react'

export type PanelPlacement = { top: number; left: number; side: 'top' | 'bottom' }

export const PANEL_GAP = 8
export const PANEL_PADDING = 12

export function placePanel(
  anchor: { top: number; bottom: number; left: number; right: number },
  panel: { width: number; height: number },
  viewport: { width: number; height: number },
): PanelPlacement {
  const below = viewport.height - anchor.bottom - PANEL_GAP - PANEL_PADDING
  const above = anchor.top - PANEL_GAP - PANEL_PADDING
  const side: 'top' | 'bottom' = panel.height <= below || below >= above ? 'bottom' : 'top'

  const rawTop =
    side === 'bottom' ? anchor.bottom + PANEL_GAP : anchor.top - PANEL_GAP - panel.height
  const maxTop = Math.max(PANEL_PADDING, viewport.height - PANEL_PADDING - panel.height)
  const top = Math.min(Math.max(rawTop, PANEL_PADDING), maxTop)

  const maxLeft = Math.max(PANEL_PADDING, viewport.width - PANEL_PADDING - panel.width)
  const left = Math.min(Math.max(anchor.left, PANEL_PADDING), maxLeft)

  return { top, left, side }
}

export function panelHost(anchor: HTMLElement | null): HTMLElement {
  return anchor?.closest<HTMLElement>('[data-slot="dialog-content"]') ?? document.body
}

export function useAnchoredPanel(
  open: boolean,
  anchorRef: React.RefObject<HTMLElement | null>,
  panelRef: React.RefObject<HTMLElement | null>,
): PanelPlacement | null {
  const [placement, setPlacement] = useState<PanelPlacement | null>(null)

  const measure = useCallback(() => {
    const anchor = anchorRef.current
    const panel = panelRef.current
    if (!anchor || !panel) return
    const box = anchor.getBoundingClientRect()
    const inViewport = placePanel(
      { top: box.top, bottom: box.bottom, left: box.left, right: box.right },
      { width: panel.offsetWidth, height: panel.offsetHeight },
      { width: window.innerWidth, height: window.innerHeight },
    )
    const host = panel.offsetParent
    const origin = host instanceof HTMLElement ? host.getBoundingClientRect() : null
    setPlacement(
      origin === null
        ? inViewport
        : { ...inViewport, top: inViewport.top - origin.top, left: inViewport.left - origin.left },
    )
  }, [anchorRef, panelRef])

  useLayoutEffect(() => {
    if (!open) {
      setPlacement(null)
      return
    }
    measure()
  }, [open, measure])

  useEffect(() => {
    if (!open) return
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [open, measure])

  return placement
}
