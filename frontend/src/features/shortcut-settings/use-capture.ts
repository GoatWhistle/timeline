import { useEffect, useRef, useState } from 'react'
import { captureCombo, isModifierOnly } from '@/shared/keyboard/shortcut-bindings'

export const CHORD_WINDOW_MS = 900

export function useCaptureKeys(
  active: boolean,
  onCombo: (combo: string) => void,
): { pending: string | null } {
  const [pending, setPending] = useState<string | null>(null)
  const latest = useRef(onCombo)
  latest.current = onCombo

  useEffect(() => {
    if (!active) setPending(null)
  }, [active])

  useEffect(() => {
    if (!active) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.isComposing || isModifierOnly(event)) return
      event.preventDefault()
      event.stopPropagation()

      if (event.key === 'Escape' && pending === null) {
        latest.current('')
        return
      }

      const captured = captureCombo(event, pending)
      if (captured === null) return

      setPending(null)
      latest.current(captured)

      if (pending === null && !captured.includes('+') && [...event.key].length === 1) {
        setPending(captured)
      }
    }

    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [active, pending])

  useEffect(() => {
    if (pending === null) return
    const timer = setTimeout(() => setPending(null), CHORD_WINDOW_MS)
    return () => clearTimeout(timer)
  }, [pending])

  return { pending }
}
