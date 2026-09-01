import {
  isChordPrefix,
  isEditableTarget,
  isInteractiveTarget,
  isTypeAheadKey,
  type KeyEventLike,
  keyAliases,
  normalizeKey,
  resolveShortcut,
  type ShortcutDefinition,
  type ShortcutScope,
  visibleShortcuts,
} from './shortcut-registry'

const CHORD_TIMEOUT_MS = 1200

export class ShortcutRegistry {
  private stack: ShortcutScope[] = []
  private bindings: Record<string, string> = {}
  private chord: string | null = null
  private chordAt = 0
  private listeners = new Set<() => void>()
  private boundCache: ShortcutScope[] | null = null

  push(scope: ShortcutScope): () => void {
    this.stack = [...this.stack, scope]
    this.emit()
    return () => this.remove(scope.id)
  }

  setBindings(bindings: Record<string, string>): void {
    this.bindings = bindings
    this.chord = null
    this.emit()
  }

  getBindings(): Record<string, string> {
    return this.bindings
  }

  private bound(): ShortcutScope[] {
    if (Object.keys(this.bindings).length === 0) return this.stack
    if (this.boundCache !== null) return this.boundCache
    this.boundCache = this.stack.map((scope) => ({
      ...scope,
      shortcuts: scope.shortcuts.map((shortcut) => {
        const override = this.bindings[shortcut.id]
        return override === undefined ? shortcut : { ...shortcut, keys: [override] }
      }),
    }))
    return this.boundCache
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
    return this.bound()
  }

  list(): ShortcutDefinition[] {
    return visibleShortcuts(this.bound())
  }

  listExcluding(scopeId: string): ShortcutDefinition[] {
    return visibleShortcuts(this.bound().filter((scope) => scope.id !== scopeId))
  }

  pendingChord(): string | null {
    return this.chord
  }

  handle(event: KeyEventLike, target?: unknown, now = Date.now()): ShortcutDefinition | null {
    const stack = this.bound()
    const aliases = keyAliases(event)
    const pressed = aliases[0] ?? normalizeKey(event)
    if (this.chord !== null && now - this.chordAt > CHORD_TIMEOUT_MS) this.chord = null

    const typeAhead = !pressed.includes('+') && isTypeAheadKey(pressed)
    const editable = isEditableTarget(target) || (typeAhead && isInteractiveTarget(target))

    let found: ShortcutDefinition | null = null
    for (const alias of aliases) {
      found = resolveShortcut(stack, alias, this.chord, editable)
      if (found) break
    }

    if (found) {
      this.chord = null
      this.emit()
      found.run()
      return found
    }

    const prefix = aliases.find((alias) => isChordPrefix(stack, alias))
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
    this.boundCache = null
    for (const listener of this.listeners) listener()
  }
}
