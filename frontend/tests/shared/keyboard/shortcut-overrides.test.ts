import { describe, expect, it, vi } from 'vitest'
import { type ShortcutDefinition, ShortcutRegistry } from '@/shared/keyboard/shortcut-registry'

function shortcut(
  id: string,
  keys: string[],
  extra: Partial<ShortcutDefinition> = {},
): ShortcutDefinition {
  return { id, keys, titleKey: `shortcuts.${id}`, group: 'global', run: () => {}, ...extra }
}

function scope(id: string, shortcuts: ShortcutDefinition[]) {
  return { id, mode: 'normal' as const, shortcuts }
}

type Modifiers = Partial<Record<'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey', boolean>>

function press(key: string, modifiers: Modifiers = {}) {
  return { key, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, ...modifiers }
}

describe('overrides in the live registry', () => {
  it('takes effect without a reload', () => {
    const run = vi.fn()
    const registry = new ShortcutRegistry()
    registry.push(scope('app', [{ ...shortcut('command-palette', ['mod+k']), run }]))

    registry.setBindings({ 'command-palette': 'mod+j' })

    registry.handle(press('k', { ctrlKey: true }))
    expect(run).not.toHaveBeenCalled()

    registry.handle(press('j', { ctrlKey: true }))
    expect(run).toHaveBeenCalledOnce()
  })

  it('restores the default when the override is dropped', () => {
    const run = vi.fn()
    const registry = new ShortcutRegistry()
    registry.push(scope('app', [{ ...shortcut('command-palette', ['mod+k']), run }]))

    registry.setBindings({ 'command-palette': 'mod+j' })
    registry.setBindings({})

    registry.handle(press('k', { ctrlKey: true }))
    expect(run).toHaveBeenCalledOnce()
  })

  it('shows the override in the list the settings screen reads', () => {
    const registry = new ShortcutRegistry()
    registry.push(scope('app', [shortcut('command-palette', ['mod+k'])]))
    registry.setBindings({ 'command-palette': 'mod+j' })

    expect(registry.list()[0]?.keys).toEqual(['mod+j'])
  })

  it('keeps a remapped chord working end to end', () => {
    const run = vi.fn()
    const registry = new ShortcutRegistry()
    registry.push(scope('app', [{ ...shortcut('goto-events', ['g e']), run }]))
    registry.setBindings({ 'goto-events': 'z e' })

    registry.handle(press('g'))
    registry.handle(press('e'))
    expect(run).not.toHaveBeenCalled()

    registry.handle(press('z'))
    registry.handle(press('e'))
    expect(run).toHaveBeenCalledOnce()
  })

  it('does not let a remapped shortcut fire while text is being typed', () => {
    const run = vi.fn()
    const registry = new ShortcutRegistry()
    registry.push(scope('app', [{ ...shortcut('list-next', ['j']), run }]))
    registry.setBindings({ 'list-next': 'u' })

    registry.handle(press('u'), { tagName: 'INPUT' })
    expect(run).not.toHaveBeenCalled()

    registry.handle(press('u'), { tagName: 'DIV' })
    expect(run).toHaveBeenCalledOnce()
  })
})
