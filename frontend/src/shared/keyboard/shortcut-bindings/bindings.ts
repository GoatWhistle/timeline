import type { ScopeListing, ShortcutDefinition, ShortcutScope } from '../shortcut-registry'
import { comboLatin, comboValid, normalizeCombo, reservedReason } from './combo'
import type { ShortcutPlatform } from './platform'

export type ShortcutBindings = Record<string, string>

export type BindingRejection =
  | { kind: 'invalid' }
  | { kind: 'reserved'; reasonKey: string }
  | { kind: 'conflict'; actionId: string; titleKey: string; scopeId: string }

export function applyBindings(
  shortcuts: ShortcutDefinition[],
  bindings: ShortcutBindings,
): ShortcutDefinition[] {
  return shortcuts.map((shortcut) => {
    const override = bindings[shortcut.id]
    return override === undefined ? shortcut : { ...shortcut, keys: [override] }
  })
}

export function applyBindingsToScopes(
  scopes: ShortcutScope[],
  bindings: ShortcutBindings,
): ShortcutScope[] {
  return scopes.map((scope) => ({
    ...scope,
    shortcuts: applyBindings(scope.shortcuts, bindings),
  }))
}

function reaches(listings: ScopeListing[], fromIndex: number, otherIndex: number): boolean {
  if (fromIndex === otherIndex) return true
  const [low, high] = fromIndex < otherIndex ? [fromIndex, otherIndex] : [otherIndex, fromIndex]
  for (let index = low + 1; index <= high; index += 1) {
    if (listings[index]?.mode === 'exclusive') return false
  }
  return true
}

function comboClash(left: string, right: string): boolean {
  const a = comboLatin(left)
  const b = comboLatin(right)
  if (a === b) return true
  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a]
  return !shorter.includes(' ') && longer.startsWith(`${shorter} `)
}

export function findRejection(
  listings: ScopeListing[],
  actionId: string,
  raw: string,
  platform: ShortcutPlatform,
  bindings: ShortcutBindings,
): BindingRejection | null {
  const combo = normalizeCombo(raw)
  if (!comboValid(combo)) return { kind: 'invalid' }

  const reasonKey = reservedReason(combo, platform)
  if (reasonKey !== null) return { kind: 'reserved', reasonKey }

  const ownIndex = listings.findIndex((scope) =>
    scope.shortcuts.some((shortcut) => shortcut.id === actionId),
  )
  if (ownIndex < 0) return null

  for (let index = 0; index < listings.length; index += 1) {
    const scope = listings[index]
    if (!scope || !reaches(listings, ownIndex, index)) continue
    for (const shortcut of scope.shortcuts) {
      if (shortcut.id === actionId) continue
      const keys =
        bindings[shortcut.id] === undefined ? shortcut.keys : [bindings[shortcut.id] ?? '']
      if (!keys.some((key) => comboClash(key, combo))) continue
      return {
        kind: 'conflict',
        actionId: shortcut.id,
        titleKey: shortcut.titleKey,
        scopeId: scope.id,
      }
    }
  }
  return null
}

export function withBinding(
  bindings: ShortcutBindings,
  actionId: string,
  combo: string,
): ShortcutBindings {
  return { ...bindings, [actionId]: normalizeCombo(combo) }
}

export function withoutBinding(bindings: ShortcutBindings, actionId: string): ShortcutBindings {
  const { [actionId]: _removed, ...rest } = bindings
  return rest
}
