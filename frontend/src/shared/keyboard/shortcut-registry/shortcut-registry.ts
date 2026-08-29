import { toLatinLayout } from '../layout-map/layout-map'

export type ShortcutScopeMode = 'normal' | 'exclusive'

export type ShortcutGroup = 'navigation' | 'list' | 'action' | 'global'

export type ShortcutDefinition = {
  id: string
  keys: string[]
  titleKey: string
  group: ShortcutGroup
  run: () => void
  when?: () => boolean
  hidden?: boolean
  allowInInput?: boolean
}

export type ShortcutScope = {
  id: string
  mode: ShortcutScopeMode
  shortcuts: ShortcutDefinition[]
}

export type KeyEventLike = {
  key: string
  code?: string
  ctrlKey: boolean
  metaKey: boolean
  shiftKey: boolean
  altKey: boolean
}

const ESCAPE = 'escape'
const CHORD_TIMEOUT_MS = 1200
const ALPHANUMERIC = /^[\p{Letter}\p{Number}]$/u

export function isTypeAheadKey(pressed: string): boolean {
  return ALPHANUMERIC.test(pressed)
}

export function normalizeKey(event: KeyEventLike): string {
  const parts: string[] = []
  if (event.ctrlKey || event.metaKey) parts.push('mod')
  if (event.altKey) parts.push('alt')

  const raw = event.key
  const lower = raw.length === 1 ? raw.toLocaleLowerCase('ru') : raw.toLowerCase()

  if (event.shiftKey && lower.length > 1) parts.push('shift')
  parts.push(lower === ' ' ? 'space' : lower)
  return parts.join('+')
}

export function keyAliases(event: KeyEventLike): string[] {
  const pressed = normalizeKey(event)
  if (event.key.length !== 1) return [pressed]

  const latin = toLatinLayout(event.key)
  if (latin === event.key.toLocaleLowerCase('ru')) return [pressed]

  const transliterated = normalizeKey({ ...event, key: latin })
  return transliterated === pressed ? [pressed] : [pressed, transliterated]
}

export function isEditableTarget(target: unknown): boolean {
  if (!target || typeof target !== 'object') return false
  const element = target as { tagName?: string; isContentEditable?: boolean }
  if (element.isContentEditable === true) return true
  const tag = element.tagName?.toLowerCase()
  return tag === 'input' || tag === 'textarea' || tag === 'select'
}

const INTERACTIVE_TAGS = new Set(['button', 'a', 'summary', 'option'])

export function isInteractiveTarget(target: unknown): boolean {
  if (!target || typeof target !== 'object') return false
  const element = target as {
    tagName?: string
    getAttribute?: (name: string) => string | null
  }
  const tag = element.tagName?.toLowerCase()
  if (tag && INTERACTIVE_TAGS.has(tag)) return true
  const role = element.getAttribute?.('role')
  return role === 'button' || role === 'menuitem' || role === 'tab' || role === 'switch'
}

export function activeScopes(stack: ShortcutScope[]): ShortcutScope[] {
  for (let index = stack.length - 1; index >= 0; index -= 1) {
    if (stack[index]?.mode === 'exclusive') return stack.slice(index)
  }
  return stack
}

export function visibleShortcuts(stack: ShortcutScope[]): ShortcutDefinition[] {
  const seen = new Set<string>()
  const result: ShortcutDefinition[] = []
  for (const scope of activeScopes(stack).slice().reverse()) {
    for (const shortcut of scope.shortcuts) {
      if (seen.has(shortcut.id)) continue
      if (shortcut.when && !shortcut.when()) continue
      seen.add(shortcut.id)
      result.push(shortcut)
    }
  }
  return result
}

export type ScopeListing = {
  id: string
  mode: ShortcutScopeMode
  shortcuts: ShortcutDefinition[]
}

export function listByScope(stack: ShortcutScope[]): ScopeListing[] {
  const seen = new Set<string>()
  const result: ScopeListing[] = []
  for (const scope of stack.slice().reverse()) {
    const shortcuts: ShortcutDefinition[] = []
    for (const shortcut of scope.shortcuts) {
      if (shortcut.hidden === true) continue
      if (seen.has(shortcut.id)) continue
      seen.add(shortcut.id)
      shortcuts.push(shortcut)
    }
    if (shortcuts.length > 0) result.push({ id: scope.id, mode: scope.mode, shortcuts })
  }
  return result.reverse()
}

function matches(shortcut: ShortcutDefinition, pressed: string, chord: string | null): boolean {
  return shortcut.keys.some((combo) => {
    const steps = combo.split(' ')
    if (steps.length === 2) return chord === steps[0] && steps[1] === pressed
    return chord === null && steps[0] === pressed
  })
}

export function isChordPrefix(stack: ShortcutScope[], pressed: string): boolean {
  return activeScopes(stack).some((scope) =>
    scope.shortcuts.some((shortcut) =>
      shortcut.keys.some((combo) => {
        const steps = combo.split(' ')
        return steps.length === 2 && steps[0] === pressed && (!shortcut.when || shortcut.when())
      }),
    ),
  )
}

export function resolveShortcut(
  stack: ShortcutScope[],
  pressed: string,
  chord: string | null,
  editable: boolean,
): ShortcutDefinition | null {
  for (const scope of activeScopes(stack).slice().reverse()) {
    for (const shortcut of scope.shortcuts) {
      if (editable && !shortcut.allowInInput && pressed !== ESCAPE) continue
      if (shortcut.when && !shortcut.when()) continue
      if (matches(shortcut, pressed, chord)) return shortcut
    }
  }
  return null
}

export class ShortcutRegistry {
  private stack: ShortcutScope[] = []
  private chord: string | null = null
  private chordAt = 0
  private listeners = new Set<() => void>()

  push(scope: ShortcutScope): () => void {
    this.stack = [...this.stack, scope]
    this.emit()
    return () => this.remove(scope.id)
  }

  remove(id: string): void {
    const next = this.stack.filter((scope) => scope.id !== id)
    if (next.length === this.stack.length) return
    this.stack = next
    this.chord = null
    this.emit()
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getScopes(): ShortcutScope[] {
    return this.stack
  }

  list(): ShortcutDefinition[] {
    return visibleShortcuts(this.stack)
  }

  listExcluding(scopeId: string): ShortcutDefinition[] {
    return visibleShortcuts(this.stack.filter((scope) => scope.id !== scopeId))
  }

  pendingChord(): string | null {
    return this.chord
  }

  handle(event: KeyEventLike, target?: unknown, now = Date.now()): ShortcutDefinition | null {
    const aliases = keyAliases(event)
    const pressed = aliases[0] ?? normalizeKey(event)
    if (this.chord !== null && now - this.chordAt > CHORD_TIMEOUT_MS) this.chord = null

    const typeAhead = !pressed.includes('+') && isTypeAheadKey(pressed)
    const editable = isEditableTarget(target) || (typeAhead && isInteractiveTarget(target))

    let found: ShortcutDefinition | null = null
    for (const alias of aliases) {
      found = resolveShortcut(this.stack, alias, this.chord, editable)
      if (found) break
    }

    if (found) {
      this.chord = null
      this.emit()
      found.run()
      return found
    }

    const prefix = aliases.find((alias) => isChordPrefix(this.stack, alias))
    if (this.chord === null && !editable && prefix !== undefined) {
      this.chord = prefix
      this.chordAt = now
      this.emit()
      return null
    }

    if (this.chord !== null) {
      this.chord = null
      this.emit()
    }
    return null
  }

  private emit(): void {
    for (const listener of this.listeners) listener()
  }
}
