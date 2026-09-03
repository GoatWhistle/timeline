import { describe, expect, it, vi } from 'vitest'
import {
  isEditableTarget,
  isInteractiveTarget,
  normalizeKey,
  type ShortcutDefinition,
  ShortcutRegistry,
  visibleShortcuts,
} from '@/shared/keyboard/shortcut-registry'

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

describe('normalizeKey', () => {
  it('lowercases latin keys', () => {
    expect(normalizeKey(press('J'))).toBe('j')
  })

  it('lowercases cyrillic keys with the russian locale', () => {
    expect(normalizeKey(press('Ф'))).toBe('ф')
  })

  it('folds ctrl and meta into one mod token', () => {
    expect(normalizeKey(press('k', { ctrlKey: true }))).toBe('mod+k')
    expect(normalizeKey(press('k', { metaKey: true }))).toBe('mod+k')
  })

  it('keeps named keys intact', () => {
    expect(normalizeKey(press('Escape'))).toBe('escape')
  })
})

describe('typing in an input', () => {
  it('does not fire a plain shortcut while an input has focus', () => {
    const run = vi.fn()
    const registry = new ShortcutRegistry()
    registry.push({ id: 'list', mode: 'normal', shortcuts: [shortcut('search', ['/'], run)] })

    registry.handle(press('/'), { tagName: 'INPUT' })
    expect(run).not.toHaveBeenCalled()
  })

  it('fires escape even from inside an input', () => {
    const run = vi.fn()
    const registry = new ShortcutRegistry()
    registry.push({ id: 'list', mode: 'normal', shortcuts: [shortcut('clear', ['escape'], run)] })

    registry.handle(press('Escape'), { tagName: 'INPUT' })
    expect(run).toHaveBeenCalledOnce()
  })

  it('fires a shortcut marked allowInInput', () => {
    const run = vi.fn()
    const registry = new ShortcutRegistry()
    registry.push({
      id: 'palette',
      mode: 'normal',
      shortcuts: [shortcut('open', ['mod+k'], run, { allowInInput: true })],
    })

    registry.handle(press('k', { metaKey: true }), { tagName: 'INPUT' })
    expect(run).toHaveBeenCalledOnce()
  })

  it('does not fire a plain letter while a button has focus', () => {
    const run = vi.fn()
    const registry = new ShortcutRegistry()
    registry.push({ id: 'list', mode: 'normal', shortcuts: [shortcut('next', ['j'], run)] })

    registry.handle(press('j'), { tagName: 'BUTTON', getAttribute: () => null })
    expect(run).not.toHaveBeenCalled()
  })

  it('still fires a modified shortcut from a focused button', () => {
    const run = vi.fn()
    const registry = new ShortcutRegistry()
    registry.push({
      id: 'app',
      mode: 'normal',
      shortcuts: [shortcut('palette', ['mod+k'], run)],
    })

    registry.handle(press('k', { metaKey: true }), { tagName: 'BUTTON', getAttribute: () => null })
    expect(run).toHaveBeenCalledOnce()
  })

  it('still fires the help sheet on ? from a focused button', () => {
    const run = vi.fn()
    const registry = new ShortcutRegistry()
    registry.push({ id: 'app', mode: 'normal', shortcuts: [shortcut('help', ['?'], run)] })

    registry.handle(press('?', { shiftKey: true }), { tagName: 'BUTTON', getAttribute: () => null })
    expect(run).toHaveBeenCalledOnce()
  })

  it('still fires a punctuation shortcut from a focused link', () => {
    const run = vi.fn()
    const registry = new ShortcutRegistry()
    registry.push({ id: 'list', mode: 'normal', shortcuts: [shortcut('search', ['/'], run)] })

    registry.handle(press('/'), { tagName: 'A', getAttribute: () => null })
    expect(run).toHaveBeenCalledOnce()
  })

  it('keeps punctuation out of shortcuts while a text field has focus', () => {
    const run = vi.fn()
    const registry = new ShortcutRegistry()
    registry.push({ id: 'app', mode: 'normal', shortcuts: [shortcut('help', ['?'], run)] })

    registry.handle(press('?', { shiftKey: true }), { tagName: 'INPUT' })
    expect(run).not.toHaveBeenCalled()
  })

  it('yields a cyrillic letter to a focused button the same way as a latin one', () => {
    const run = vi.fn()
    const registry = new ShortcutRegistry()
    registry.push({ id: 'list', mode: 'normal', shortcuts: [shortcut('next', ['о'], run)] })

    registry.handle(press('о'), { tagName: 'BUTTON', getAttribute: () => null })
    expect(run).not.toHaveBeenCalled()
  })

  it('still fires escape from a focused button', () => {
    const run = vi.fn()
    const registry = new ShortcutRegistry()
    registry.push({ id: 'list', mode: 'normal', shortcuts: [shortcut('clear', ['escape'], run)] })

    registry.handle(press('Escape'), { tagName: 'BUTTON', getAttribute: () => null })
    expect(run).toHaveBeenCalledOnce()
  })

  it('treats an element with a button role as interactive', () => {
    expect(isInteractiveTarget({ tagName: 'DIV', getAttribute: () => 'button' })).toBe(true)
    expect(isInteractiveTarget({ tagName: 'DIV', getAttribute: () => null })).toBe(false)
  })

  it('recognises contenteditable as editable', () => {
    expect(isEditableTarget({ isContentEditable: true })).toBe(true)
    expect(isEditableTarget({ tagName: 'DIV' })).toBe(false)
  })
})

describe('listExcluding', () => {
  it('lists the shortcuts a help sheet would otherwise mask with its own exclusive scope', () => {
    const registry = new ShortcutRegistry()
    registry.push({
      id: 'app',
      mode: 'normal',
      shortcuts: [shortcut('help', ['?'], vi.fn()), shortcut('palette', ['mod+k'], vi.fn())],
    })
    registry.push({ id: 'shortcut-help', mode: 'exclusive', shortcuts: [] })

    expect(registry.list()).toHaveLength(0)
    expect(registry.listExcluding('shortcut-help').map((item) => item.id)).toEqual([
      'help',
      'palette',
    ])
  })

  it('still hides scopes masked by a different exclusive scope', () => {
    const registry = new ShortcutRegistry()
    registry.push({ id: 'app', mode: 'normal', shortcuts: [shortcut('help', ['?'], vi.fn())] })
    registry.push({ id: 'dialog', mode: 'exclusive', shortcuts: [] })
    registry.push({ id: 'shortcut-help', mode: 'exclusive', shortcuts: [] })

    expect(registry.listExcluding('shortcut-help')).toHaveLength(0)
  })
})

describe('visibleShortcuts', () => {
  it('lists only what the active scopes expose', () => {
    const stack = [
      { id: 'app', mode: 'normal' as const, shortcuts: [shortcut('help', ['?'], vi.fn())] },
      { id: 'list', mode: 'normal' as const, shortcuts: [shortcut('next', ['j'], vi.fn())] },
    ]
    expect(visibleShortcuts(stack).map((item) => item.id)).toEqual(['next', 'help'])
  })

  it('hides shortcuts below an exclusive scope', () => {
    const stack = [
      { id: 'app', mode: 'normal' as const, shortcuts: [shortcut('help', ['?'], vi.fn())] },
      {
        id: 'dialog',
        mode: 'exclusive' as const,
        shortcuts: [shortcut('close', ['escape'], vi.fn())],
      },
    ]
    expect(visibleShortcuts(stack).map((item) => item.id)).toEqual(['close'])
  })

  it('deduplicates by id, keeping the topmost binding', () => {
    const stack = [
      { id: 'app', mode: 'normal' as const, shortcuts: [shortcut('go', ['g'], vi.fn())] },
      { id: 'page', mode: 'normal' as const, shortcuts: [shortcut('go', ['g'], vi.fn())] },
    ]
    expect(visibleShortcuts(stack)).toHaveLength(1)
  })

  it('drops shortcuts whose guard is false', () => {
    const stack = [
      {
        id: 'app',
        mode: 'normal' as const,
        shortcuts: [shortcut('help', ['?'], vi.fn(), { when: () => false })],
      },
    ]
    expect(visibleShortcuts(stack)).toHaveLength(0)
  })
})
