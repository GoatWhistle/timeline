import { describe, expect, it, vi } from 'vitest'
import {
  keyAliases,
  type ShortcutDefinition,
  ShortcutRegistry,
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

describe('russian keyboard layout', () => {
  it('opens the palette when ctrl and the cyrillic key on the latin k position are pressed', () => {
    const run = vi.fn()
    const registry = new ShortcutRegistry()
    registry.push({
      id: 'app',
      mode: 'normal',
      shortcuts: [shortcut('palette', ['mod+k'], run, { allowInInput: true })],
    })

    registry.handle(press('л', { ctrlKey: true }))
    expect(run).toHaveBeenCalledOnce()
  })

  it('does not let the cyrillic alias reach a list shortcut bound to the same latin letter', () => {
    const palette = vi.fn()
    const previous = vi.fn()
    const registry = new ShortcutRegistry()
    registry.push({
      id: 'app',
      mode: 'normal',
      shortcuts: [shortcut('palette', ['mod+k'], palette, { allowInInput: true })],
    })
    registry.push({
      id: 'list',
      mode: 'normal',
      shortcuts: [shortcut('list-previous', ['k', 'arrowup'], previous)],
    })

    registry.handle(press('л', { ctrlKey: true }))
    expect(palette).toHaveBeenCalledOnce()
    expect(previous).not.toHaveBeenCalled()
  })

  it('moves down the list on the cyrillic key that sits on the latin j position', () => {
    const run = vi.fn()
    const registry = new ShortcutRegistry()
    registry.push({ id: 'list', mode: 'normal', shortcuts: [shortcut('next', ['j'], run)] })

    registry.handle(press('о'))
    expect(run).toHaveBeenCalledOnce()
  })

  it('completes a two step chord typed on the russian layout', () => {
    const run = vi.fn()
    const registry = new ShortcutRegistry()
    registry.push({
      id: 'app',
      mode: 'normal',
      shortcuts: [shortcut('goto-catalog', ['g c'], run, { group: 'navigation' })],
    })

    registry.handle(press('п'))
    expect(run).not.toHaveBeenCalled()
    registry.handle(press('с'))
    expect(run).toHaveBeenCalledOnce()
  })

  it('leaves a latin binding untouched when the pressed key is already latin', () => {
    expect(keyAliases(press('k', { ctrlKey: true }))).toEqual(['mod+k'])
  })

  it('offers both the pressed cyrillic key and its latin position', () => {
    expect(keyAliases(press('л', { ctrlKey: true }))).toEqual(['mod+л', 'mod+k'])
  })

  it('keeps a cyrillic binding reachable from the cyrillic key itself', () => {
    const run = vi.fn()
    const registry = new ShortcutRegistry()
    registry.push({ id: 'app', mode: 'normal', shortcuts: [shortcut('cyr', ['ф'], run)] })

    registry.handle(press('ф'))
    expect(run).toHaveBeenCalledOnce()
  })
})
