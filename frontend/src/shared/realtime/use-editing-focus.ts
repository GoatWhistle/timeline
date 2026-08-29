import { useEffect } from 'react'
import type { EditingGuard } from './editing-guard'

const EDITABLE = new Set(['INPUT', 'TEXTAREA', 'SELECT'])
const OWNER = 'focused-field'

export function isEditableTarget(node: EventTarget | null): boolean {
  if (!(node instanceof HTMLElement)) return false
  const editable = node.getAttribute('contenteditable')
  if (node.isContentEditable || (editable !== null && editable !== 'false')) return true
  if (!EDITABLE.has(node.tagName)) return false
  if (node instanceof HTMLInputElement) {
    return node.type !== 'checkbox' && node.type !== 'radio' && node.type !== 'button'
  }
  return true
}

export function useEditingFocus(guard: EditingGuard): void {
  useEffect(() => {
    const onFocus = (event: FocusEvent) => {
      if (isEditableTarget(event.target)) guard.hold(OWNER)
    }
    const onBlur = (event: FocusEvent) => {
      if (isEditableTarget(event.target)) guard.release(OWNER)
    }
    document.addEventListener('focusin', onFocus)
    document.addEventListener('focusout', onBlur)
    return () => {
      document.removeEventListener('focusin', onFocus)
      document.removeEventListener('focusout', onBlur)
      guard.release(OWNER)
    }
  }, [guard])
}
