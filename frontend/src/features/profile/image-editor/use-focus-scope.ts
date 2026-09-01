import { type RefObject, useEffect } from 'react'

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function focusable(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (node) => node.tabIndex !== -1 && !node.hasAttribute('hidden'),
  )
}

export function useFocusScope(ref: RefObject<HTMLElement | null>, onEscape: () => void): void {
  useEffect(() => {
    const panel = ref.current
    if (!panel) return

    const origin = document.activeElement instanceof HTMLElement ? document.activeElement : null

    focusable(panel)[0]?.focus()

    function onKeyDown(event: KeyboardEvent) {
      const root = ref.current
      if (!root) return

      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        event.stopImmediatePropagation()
        onEscape()
        return
      }

      if (event.key !== 'Tab') return
      const items = focusable(root)
      if (items.length === 0) return

      const first = items[0]
      const last = items[items.length - 1]
      if (!first || !last) return
      const active = document.activeElement

      if (!root.contains(active)) {
        event.preventDefault()
        first.focus()
        return
      }
      if (event.shiftKey && active === first) {
        event.preventDefault()
        last.focus()
        return
      }
      if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    function onFocusIn(event: FocusEvent) {
      const root = ref.current
      if (!root || root.contains(event.target as Node)) return
      focusable(root)[0]?.focus()
    }

    window.addEventListener('keydown', onKeyDown, true)
    document.addEventListener('focusin', onFocusIn, true)

    return () => {
      window.removeEventListener('keydown', onKeyDown, true)
      document.removeEventListener('focusin', onFocusIn, true)
      origin?.focus({ preventScroll: true })
    }
  }, [onEscape, ref])
}
