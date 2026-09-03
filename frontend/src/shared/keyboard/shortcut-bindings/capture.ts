import { type KeyEventLike, normalizeKey } from '../shortcut-registry'

const MODIFIER_KEYS = new Set(['control', 'meta', 'shift', 'alt', 'altgraph', 'capslock'])

export function isModifierOnly(event: KeyEventLike): boolean {
  return MODIFIER_KEYS.has(event.key.toLowerCase())
}

export function heldModifiers(event: KeyEventLike): string[] {
  const parts: string[] = []
  if (event.ctrlKey || event.metaKey) parts.push('mod')
  if (event.altKey) parts.push('alt')
  if (event.shiftKey) parts.push('shift')
  return parts
}

export function captureCombo(event: KeyEventLike, chord: string | null): string | null {
  if (isModifierOnly(event)) return null
  const pressed = normalizeKey(event)
  return chord === null ? pressed : `${chord} ${pressed}`
}
