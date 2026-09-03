import { useCallback, useEffect, useRef, useState } from 'react'
import { captureCombo, heldModifiers, isModifierOnly } from '@/shared/keyboard/shortcut-bindings'

const CHORD_WINDOW_MS = 900

export type CaptureDraft = {
  combo: string | null
  held: string[]
}

const EMPTY: CaptureDraft = { combo: null, held: [] }

export function useCaptureKeys(
  active: boolean,
  onCancel: () => void,
): { draft: CaptureDraft; clear: () => void } {
  const [draft, setDraft] = useState<CaptureDraft>(EMPTY)
  const chordOpenUntil = useRef(0)

  const clear = useCallback(() => {
    chordOpenUntil.current = 0
    setDraft(EMPTY)
  }, [])

  useEffect(() => {
    if (!active) clear()
  }, [active, clear])

  useEffect(() => {
    if (!active) return

    function onKeyUp(event: KeyboardEvent) {
      if (!isModifierOnly(event)) return
      setDraft((current) =>
        current.held.length === 0 ? current : { ...current, held: heldModifiers(event) },
      )
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.isComposing) return
      event.preventDefault()
      event.stopPropagation()

      if (isModifierOnly(event)) {
        setDraft((current) => ({ ...current, held: heldModifiers(event) }))
        return
      }

      if (event.key === 'Escape' && heldModifiers(event).length === 0) {
        onCancel()
        return
      }

      const openUntil = chordOpenUntil.current
      chordOpenUntil.current = Date.now() + CHORD_WINDOW_MS

      setDraft((current) => {
        const previous = current.combo
        const chord =
          previous !== null &&
          Date.now() < openUntil &&
          !previous.includes(' ') &&
          !previous.includes('+')
            ? previous
            : null
        const captured = captureCombo(event, chord)
        if (captured === null) return current
        return { combo: captured, held: [] }
      })
    }

    window.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('keyup', onKeyUp, true)
    return () => {
      window.removeEventListener('keydown', onKeyDown, true)
      window.removeEventListener('keyup', onKeyUp, true)
    }
  }, [active, onCancel])

  return { draft, clear }
}
