import { describe, expect, it, vi } from 'vitest'
import { captureCombo, comboValid, normalizeCombo } from '@/shared/keyboard/shortcut-bindings'
import {
  normalizeKey,
  type ShortcutDefinition,
  ShortcutRegistry,
} from '@/shared/keyboard/shortcut-registry'

type Modifiers = Partial<Record<'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey', boolean>>

function press(key: string, modifiers: Modifiers = {}) {
  return { key, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, ...modifiers }
}

function shortcut(id: string, keys: string[], run: () => void): ShortcutDefinition {
  return { id, keys, titleKey: `shortcuts.${id}`, group: 'global', run }
}

describe('shift is a modifier when it only changes the case of a letter', () => {
  it('records shift and the letter, not the capital letter on its own', () => {
    expect(captureCombo(press('A', { shiftKey: true }), null)).toBe('shift+a')
  })

  it('records a cyrillic letter under shift the same way', () => {
    expect(captureCombo(press('Ф', { shiftKey: true }), null)).toBe('shift+ф')
  })

  it('keeps shift out of a character the key itself produces', () => {
    expect(captureCombo(press('?', { shiftKey: true }), null)).toBe('?')
    expect(captureCombo(press('!', { shiftKey: true }), null)).toBe('!')
    expect(captureCombo(press('_', { shiftKey: true }), null)).toBe('_')
  })

  it('keeps shift on a named key, which no shift can respell', () => {
    expect(captureCombo(press('ArrowDown', { shiftKey: true }), null)).toBe('shift+arrowdown')
    expect(captureCombo(press('Enter', { shiftKey: true }), null)).toBe('shift+enter')
  })
})

describe('every modifier survives being recorded', () => {
  it('records alt with a letter', () => {
    expect(captureCombo(press('a', { altKey: true }), null)).toBe('alt+a')
  })

  it('records control and meta alike, as the portable modifier', () => {
    expect(captureCombo(press('a', { ctrlKey: true }), null)).toBe('mod+a')
    expect(captureCombo(press('a', { metaKey: true }), null)).toBe('mod+a')
  })

  it('records every pairing of the three modifiers in the order the grammar demands', () => {
    expect(captureCombo(press('A', { ctrlKey: true, shiftKey: true }), null)).toBe('mod+shift+a')
    expect(captureCombo(press('a', { ctrlKey: true, altKey: true }), null)).toBe('mod+alt+a')
    expect(captureCombo(press('A', { altKey: true, shiftKey: true }), null)).toBe('alt+shift+a')
    expect(captureCombo(press('A', { ctrlKey: true, altKey: true, shiftKey: true }), null)).toBe(
      'mod+alt+shift+a',
    )
  })

  it('produces combinations the grammar accepts, so save is never refused as malformed', () => {
    for (const event of [
      press('A', { shiftKey: true }),
      press('a', { altKey: true }),
      press('A', { ctrlKey: true, shiftKey: true }),
      press('A', { ctrlKey: true, altKey: true, shiftKey: true }),
      press('ArrowDown', { shiftKey: true }),
      press('1', { ctrlKey: true }),
    ]) {
      const captured = captureCombo(event, null)
      expect(captured, JSON.stringify(event)).not.toBeNull()
      expect(comboValid(normalizeCombo(captured ?? '')), captured ?? '').toBe(true)
    }
  })

  it('never drops a modifier that was held down', () => {
    for (const event of [
      press('A', { shiftKey: true }),
      press('a', { altKey: true }),
      press('a', { ctrlKey: true }),
      press('A', { altKey: true, shiftKey: true }),
    ]) {
      const captured = captureCombo(event, null) ?? ''
      if (event.shiftKey) expect(captured, captured).toContain('shift')
      if (event.altKey) expect(captured, captured).toContain('alt')
      if (event.ctrlKey) expect(captured, captured).toContain('mod')
    }
  })
})

describe('a recorded modifier combination fires later', () => {
  it('runs a shifted letter shortcut when that very chord is pressed', () => {
    const run = vi.fn()
    const registry = new ShortcutRegistry()
    registry.push({ id: 'app', mode: 'normal', shortcuts: [shortcut('x', ['shift+a'], run)] })

    registry.handle(press('a'))
    expect(run).not.toHaveBeenCalled()

    registry.handle(press('A', { shiftKey: true }))
    expect(run).toHaveBeenCalledOnce()
  })

  it('does not fire a plain letter shortcut when shift is held', () => {
    const run = vi.fn()
    const registry = new ShortcutRegistry()
    registry.push({ id: 'app', mode: 'normal', shortcuts: [shortcut('x', ['a'], run)] })

    registry.handle(press('A', { shiftKey: true }))
    expect(run).not.toHaveBeenCalled()
  })

  it('still fires a shortcut bound to a character shift produces', () => {
    const run = vi.fn()
    const registry = new ShortcutRegistry()
    registry.push({ id: 'app', mode: 'normal', shortcuts: [shortcut('help', ['?'], run)] })

    registry.handle(press('?', { shiftKey: true }))
    expect(run).toHaveBeenCalledOnce()
  })

  it('records and fires the same spelling, so what was stored is what runs', () => {
    const run = vi.fn()
    const event = press('A', { ctrlKey: true, shiftKey: true })
    const stored = captureCombo(event, null) ?? ''

    const registry = new ShortcutRegistry()
    registry.push({ id: 'app', mode: 'normal', shortcuts: [shortcut('x', [stored], run)] })
    registry.handle(event)

    expect(stored).toBe('mod+shift+a')
    expect(run).toHaveBeenCalledOnce()
  })

  it('spells a shifted cyrillic letter the same on both sides', () => {
    expect(normalizeKey(press('Ф', { shiftKey: true }))).toBe('shift+ф')
  })
})
