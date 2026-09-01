import { describe, expect, it } from 'vitest'
import { type ShortcutDefinition, ShortcutRegistry } from '@/shared/keyboard/shortcut-registry'

function shortcut(id: string, keys: string[]): ShortcutDefinition {
  return { id, keys, titleKey: `shortcuts.${id}`, group: 'global', run: () => {} }
}

function scope(id: string, shortcuts: ShortcutDefinition[]) {
  return { id, mode: 'normal' as const, shortcuts }
}

function registryWithOverride() {
  const registry = new ShortcutRegistry()
  registry.push(scope('app', [shortcut('command-palette', ['mod+k'])]))
  registry.setBindings({ 'command-palette': 'mod+j' })
  return registry
}

describe('the registry hands out a stable snapshot', () => {
  it('returns the same array when nothing changed', () => {
    const registry = registryWithOverride()
    expect(registry.getScopes()).toBe(registry.getScopes())
  })

  it('is stable without overrides too', () => {
    const registry = new ShortcutRegistry()
    registry.push(scope('app', [shortcut('command-palette', ['mod+k'])]))
    expect(registry.getScopes()).toBe(registry.getScopes())
  })

  it('hands out a fresh array once a binding changes', () => {
    const registry = registryWithOverride()
    const before = registry.getScopes()
    registry.setBindings({ 'command-palette': 'mod+p' })
    const after = registry.getScopes()

    expect(after).not.toBe(before)
    expect(after[0]?.shortcuts[0]?.keys).toEqual(['mod+p'])
  })

  it('hands out a fresh array once a scope is pushed', () => {
    const registry = registryWithOverride()
    const before = registry.getScopes()
    registry.push(scope('dialog', [shortcut('close', ['escape'])]))

    expect(registry.getScopes()).not.toBe(before)
  })

  it('hands out a fresh array once a scope is removed', () => {
    const registry = registryWithOverride()
    registry.push(scope('dialog', [shortcut('close', ['escape'])]))
    const before = registry.getScopes()
    registry.remove('dialog')

    expect(registry.getScopes()).not.toBe(before)
  })
})
