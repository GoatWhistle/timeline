import { describe, expect, it, vi } from 'vitest'
import { type ShortcutDefinition, ShortcutRegistry } from '@/shared/keyboard/shortcut-registry'

function shortcut(
  id: string,
  keys: string[],
  run: () => void,
  extra: Partial<ShortcutDefinition> = {},
): ShortcutDefinition {
  return { id, keys, titleKey: `shortcut.${id}`, group: 'global', run, ...extra }
}

type Modifiers = Partial<Record<'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey', boolean>>

function press(key: string, modifiers: Modifiers = {}) {
  return { key, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, ...modifiers }
}

describe('scope stack', () => {
  it('runs a shortcut from the only scope', () => {
    const run = vi.fn()
    const registry = new ShortcutRegistry()
    registry.push({ id: 'list', mode: 'normal', shortcuts: [shortcut('next', ['j'], run)] })

    registry.handle(press('j'))
    expect(run).toHaveBeenCalledOnce()
  })

  it('lets a later normal scope take precedence over an earlier one', () => {
    const outer = vi.fn()
    const inner = vi.fn()
    const registry = new ShortcutRegistry()
    registry.push({ id: 'outer', mode: 'normal', shortcuts: [shortcut('go', ['g'], outer)] })
    registry.push({ id: 'inner', mode: 'normal', shortcuts: [shortcut('go', ['g'], inner)] })

    registry.handle(press('g'))
    expect(inner).toHaveBeenCalledOnce()
    expect(outer).not.toHaveBeenCalled()
  })

  it('still reaches a lower normal scope for keys the upper one does not claim', () => {
    const outer = vi.fn()
    const registry = new ShortcutRegistry()
    registry.push({ id: 'outer', mode: 'normal', shortcuts: [shortcut('help', ['?'], outer)] })
    registry.push({ id: 'inner', mode: 'normal', shortcuts: [shortcut('next', ['j'], vi.fn())] })

    registry.handle(press('?'))
    expect(outer).toHaveBeenCalledOnce()
  })

  it('an exclusive scope blocks everything below it', () => {
    const below = vi.fn()
    const registry = new ShortcutRegistry()
    registry.push({ id: 'list', mode: 'normal', shortcuts: [shortcut('next', ['j'], below)] })
    registry.push({ id: 'dialog', mode: 'exclusive', shortcuts: [] })

    registry.handle(press('j'))
    expect(below).not.toHaveBeenCalled()
  })

  it('an exclusive scope still serves its own escape', () => {
    const close = vi.fn()
    const below = vi.fn()
    const registry = new ShortcutRegistry()
    registry.push({ id: 'list', mode: 'normal', shortcuts: [shortcut('next', ['j'], below)] })
    registry.push({
      id: 'dialog',
      mode: 'exclusive',
      shortcuts: [shortcut('close', ['escape'], close)],
    })

    registry.handle(press('Escape'))
    expect(close).toHaveBeenCalledOnce()
    expect(below).not.toHaveBeenCalled()
  })

  it('restores the scopes below once the exclusive scope is removed', () => {
    const below = vi.fn()
    const registry = new ShortcutRegistry()
    registry.push({ id: 'list', mode: 'normal', shortcuts: [shortcut('next', ['j'], below)] })
    const dispose = registry.push({ id: 'dialog', mode: 'exclusive', shortcuts: [] })

    registry.handle(press('j'))
    expect(below).not.toHaveBeenCalled()

    dispose()
    registry.handle(press('j'))
    expect(below).toHaveBeenCalledOnce()
  })

  it('keeps the deepest exclusive scope when two are stacked', () => {
    const first = vi.fn()
    const second = vi.fn()
    const registry = new ShortcutRegistry()
    registry.push({
      id: 'dialog-a',
      mode: 'exclusive',
      shortcuts: [shortcut('a', ['a'], first)],
    })
    registry.push({
      id: 'dialog-b',
      mode: 'exclusive',
      shortcuts: [shortcut('b', ['b'], second)],
    })

    registry.handle(press('a'))
    expect(first).not.toHaveBeenCalled()

    registry.handle(press('b'))
    expect(second).toHaveBeenCalledOnce()
  })

  it('skips a shortcut whose guard is false', () => {
    const run = vi.fn()
    const registry = new ShortcutRegistry()
    registry.push({
      id: 'list',
      mode: 'normal',
      shortcuts: [shortcut('next', ['j'], run, { when: () => false })],
    })

    registry.handle(press('j'))
    expect(run).not.toHaveBeenCalled()
  })
})

describe('chords', () => {
  it('runs a two-step chord', () => {
    const run = vi.fn()
    const registry = new ShortcutRegistry()
    registry.push({ id: 'goto', mode: 'normal', shortcuts: [shortcut('goSchedule', ['g s'], run)] })

    registry.handle(press('g'))
    expect(run).not.toHaveBeenCalled()
    registry.handle(press('s'))
    expect(run).toHaveBeenCalledOnce()
  })

  it('drops the chord after the timeout', () => {
    const run = vi.fn()
    const registry = new ShortcutRegistry()
    registry.push({ id: 'goto', mode: 'normal', shortcuts: [shortcut('goSchedule', ['g s'], run)] })

    registry.handle(press('g'), undefined, 0)
    registry.handle(press('s'), undefined, 5000)
    expect(run).not.toHaveBeenCalled()
  })

  it('clears a pending chord on an unrelated key', () => {
    const run = vi.fn()
    const registry = new ShortcutRegistry()
    registry.push({ id: 'goto', mode: 'normal', shortcuts: [shortcut('goSchedule', ['g s'], run)] })

    registry.handle(press('g'))
    registry.handle(press('x'))
    registry.handle(press('s'))
    expect(run).not.toHaveBeenCalled()
    expect(registry.pendingChord()).toBeNull()
  })

  it('does not treat a chord prefix as a standalone shortcut', () => {
    const chord = vi.fn()
    const registry = new ShortcutRegistry()
    registry.push({
      id: 'goto',
      mode: 'normal',
      shortcuts: [shortcut('goSchedule', ['g s'], chord)],
    })

    registry.handle(press('g'))
    expect(chord).not.toHaveBeenCalled()
    expect(registry.pendingChord()).toBe('g')
  })
})
