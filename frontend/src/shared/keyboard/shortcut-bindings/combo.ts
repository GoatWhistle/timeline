import { toLatinLayout } from '../layout-map/layout-map'
import type { ShortcutPlatform } from './platform'

export const MAX_STEPS = 2

const MODIFIER_RANK: Record<string, number> = { mod: 1, alt: 2, shift: 3 }

const NAMED_KEYS = new Set([
  'escape',
  'enter',
  'tab',
  'space',
  'backspace',
  'delete',
  'home',
  'end',
  'pageup',
  'pagedown',
  'arrowup',
  'arrowdown',
  'arrowleft',
  'arrowright',
  'f1',
  'f2',
  'f3',
  'f4',
  'f5',
  'f6',
  'f7',
  'f8',
  'f9',
  'f10',
  'f11',
  'f12',
])

const RESERVED_SHARED = [
  'tab',
  'escape',
  'enter',
  'backspace',
  'mod+w',
  'mod+t',
  'mod+n',
  'mod+q',
  'mod+r',
  'mod+l',
  'mod+p',
  'mod+s',
  'mod+f',
  'mod+d',
  'mod+shift+w',
  'mod+shift+t',
  'mod+shift+n',
  'mod+shift+q',
  'mod+tab',
  'alt+tab',
  'mod+shift+tab',
  'f5',
  'f11',
  'f12',
]

const RESERVED_REASON: Record<string, string> = {
  tab: 'shortcuts.reservedFocus',
  escape: 'shortcuts.reservedFocus',
  enter: 'shortcuts.reservedFocus',
  backspace: 'shortcuts.reservedFocus',
  'mod+q': 'shortcuts.reservedSystem',
  'mod+tab': 'shortcuts.reservedSystem',
  'alt+tab': 'shortcuts.reservedSystem',
  'mod+shift+tab': 'shortcuts.reservedSystem',
}

export function normalizeCombo(raw: string): string {
  return raw.trim().toLocaleLowerCase('ru').split(/\s+/).join(' ')
}

function stepValid(step: string): boolean {
  const parts = step.split('+')
  const key = parts[parts.length - 1] ?? ''
  let seen = 0
  for (const modifier of parts.slice(0, -1)) {
    const rank = MODIFIER_RANK[modifier]
    if (rank === undefined || rank <= seen) return false
    seen = rank
  }
  if (NAMED_KEYS.has(key)) return true
  return [...key].length === 1 && key !== ' '
}

export function comboValid(combo: string): boolean {
  const steps = combo.split(' ')
  if (steps.length === 0 || steps.length > MAX_STEPS) return false
  if (steps.some((step) => step === '' || !stepValid(step))) return false
  return steps.length === 1 || !(steps[0] ?? '').includes('+')
}

export function comboLatin(combo: string): string {
  return combo
    .split(' ')
    .map((step) => {
      const parts = step.split('+')
      const key = parts[parts.length - 1] ?? ''
      if ([...key].length !== 1) return step
      return [...parts.slice(0, -1), toLatinLayout(key)].join('+')
    })
    .join(' ')
}

export function reservedReason(combo: string, platform: ShortcutPlatform): string | null {
  const latin = comboLatin(combo)
  for (const step of latin.split(' ')) {
    if (RESERVED_SHARED.includes(step)) return RESERVED_REASON[step] ?? 'shortcuts.reservedBrowser'
    if (platform === 'mac' && step === 'mod+h') return 'shortcuts.reservedSystem'
    if (platform === 'other' && step === 'alt+f4') return 'shortcuts.reservedSystem'
  }
  return null
}
