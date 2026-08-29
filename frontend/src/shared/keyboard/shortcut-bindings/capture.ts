import { type KeyEventLike, normalizeKey } from '../shortcut-registry'

const MODIFIER_KEYS = new Set(['control', 'meta', 'shift', 'alt', 'altgraph', 'capslock'])

export function isModifierOnly(event: KeyEventLike): boolean {
  return MODIFIER_KEYS.has(event.key.toLowerCase())
}

export function captureCombo(event: KeyEventLike, chord: string | null): string | null {
  if (isModifierOnly(event)) return null
  const pressed = normalizeKey(event)
  return chord === null ? pressed : `${chord} ${pressed}`
}
