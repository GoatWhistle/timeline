import { describe, expect, it } from 'vitest'
import {
  applyBindings,
  captureCombo,
  comboValid,
  detectPlatform,
  findRejection,
  isModifierOnly,
  normalizeCombo,
  reservedReason,
  withBinding,
  withoutBinding,
} from '@/shared/keyboard/shortcut-bindings'
import {
  listByScope,
  type ShortcutDefinition,
  type ShortcutScope,
} from '@/shared/keyboard/shortcut-registry'

function shortcut(
  id: string,
  keys: string[],
  extra: Partial<ShortcutDefinition> = {},
): ShortcutDefinition {
  return { id, keys, titleKey: `shortcuts.${id}`, group: 'global', run: () => {}, ...extra }
}

function scope(
  id: string,
  shortcuts: ShortcutDefinition[],
  mode: 'normal' | 'exclusive' = 'normal',
): ShortcutScope {
  return { id, mode, shortcuts }
}

type Modifiers = Partial<Record<'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey', boolean>>

function press(key: string, modifiers: Modifiers = {}) {
  return { key, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, ...modifiers }
}

describe('platform detection', () => {
  it('picks the command modifier on apple hardware', () => {
    expect(detectPlatform({ platform: 'MacIntel' })).toBe('mac')
    expect(detectPlatform({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)' })).toBe('mac')
  })

  it('picks the control modifier everywhere else', () => {
    expect(detectPlatform({ platform: 'Win32' })).toBe('other')
    expect(detectPlatform({ platform: 'Linux x86_64' })).toBe('other')
  })

  it('prefers the modern user agent hint over the deprecated platform string', () => {
    expect(detectPlatform({ userAgentData: { platform: 'macOS' }, platform: 'Win32' })).toBe('mac')
  })
})

describe('combination grammar', () => {
  it('lowercases and collapses whitespace', () => {
    expect(normalizeCombo('  Mod+K  ')).toBe('mod+k')
    expect(normalizeCombo('g   E')).toBe('g e')
  })

  it('accepts a modified key, a bare key, a named key and a two step chord', () => {
    for (const combo of ['mod+k', 'j', 'escape', 'g e', 'mod+shift+p', 'arrowdown']) {
      expect(comboValid(combo), combo).toBe(true)
    }
  })

  it('refuses malformed combinations', () => {
    for (const combo of ['', 'mod+', '+k', 'shift+mod+k', 'mod+notakey', 'a b c', 'mod+k k']) {
      expect(comboValid(combo), combo).toBe(false)
    }
  })
})

describe('forbidden combinations', () => {
  it('refuses what the browser takes, so the user does not lose the key', () => {
    for (const combo of ['mod+w', 'mod+t', 'mod+n', 'mod+r', 'f5', 'f11']) {
      expect(reservedReason(combo, 'other'), combo).not.toBeNull()
    }
  })

  it('refuses the keys the interface needs to move focus', () => {
    for (const combo of ['tab', 'escape', 'enter', 'backspace']) {
      expect(reservedReason(combo, 'other'), combo).toBe('shortcuts.reservedFocus')
    }
  })

  it('refuses what each system takes for itself', () => {
    expect(reservedReason('mod+h', 'mac')).toBe('shortcuts.reservedSystem')
    expect(reservedReason('mod+h', 'other')).toBeNull()
    expect(reservedReason('alt+f4', 'other')).toBe('shortcuts.reservedSystem')
    expect(reservedReason('alt+f4', 'mac')).toBeNull()
  })

  it('sees through a cyrillic keyboard layout', () => {
    expect(reservedReason('mod+ц', 'other')).not.toBeNull()
  })

  it('refuses a reserved step hidden inside a chord', () => {
    expect(reservedReason('g mod+w', 'other')).not.toBeNull()
  })

  it('leaves an ordinary combination alone', () => {
    expect(reservedReason('mod+j', 'other')).toBeNull()
    expect(reservedReason('g e', 'other')).toBeNull()
  })
})

describe('conflict detection at assignment time', () => {
  const listings = listByScope([
    scope('app', [shortcut('command-palette', ['mod+k']), shortcut('goto-events', ['g e'])]),
    scope('list', [shortcut('list-next', ['j'])]),
  ])

  it('names the action that already holds the combination', () => {
    const rejection = findRejection(listings, 'list-next', 'mod+k', 'other', {})
    expect(rejection).toEqual({
      kind: 'conflict',
      actionId: 'command-palette',
      titleKey: 'shortcuts.command-palette',
      scopeId: 'app',
    })
  })

  it('reports a reserved combination rather than a conflict', () => {
    expect(findRejection(listings, 'list-next', 'mod+w', 'other', {})?.kind).toBe('reserved')
  })

  it('reports a malformed combination', () => {
    expect(findRejection(listings, 'list-next', 'mod+', 'other', {})?.kind).toBe('invalid')
  })

  it('lets an action keep its own combination', () => {
    expect(findRejection(listings, 'command-palette', 'mod+k', 'other', {})).toBeNull()
  })

  it('accepts a free combination', () => {
    expect(findRejection(listings, 'list-next', 'mod+j', 'other', {})).toBeNull()
  })

  it('compares against the override, not the default, once one is set', () => {
    const bindings = { 'command-palette': 'mod+j' }
    expect(findRejection(listings, 'list-next', 'mod+k', 'other', bindings)).toBeNull()
    expect(findRejection(listings, 'list-next', 'mod+j', 'other', bindings)?.kind).toBe('conflict')
  })

  it('treats a chord prefix as taken by the chord that starts with it', () => {
    expect(findRejection(listings, 'list-next', 'g', 'other', {})?.kind).toBe('conflict')
  })

  it('sees a conflict through a cyrillic layout', () => {
    expect(findRejection(listings, 'list-next', 'mod+л', 'other', {})?.kind).toBe('conflict')
  })

  it('ignores a scope walled off by an exclusive scope in between', () => {
    const walled = listByScope([
      scope('app', [shortcut('command-palette', ['mod+k'])]),
      scope('overlay', [shortcut('overlay-close', ['mod+u'])], 'exclusive'),
      scope('inner', [shortcut('inner-act', ['x'])]),
    ])
    expect(findRejection(walled, 'inner-act', 'mod+k', 'other', {})).toBeNull()
    expect(findRejection(walled, 'inner-act', 'mod+u', 'other', {})?.kind).toBe('conflict')
  })
})

describe('binding maps', () => {
  it('replaces the keys of the bound action only', () => {
    const bound = applyBindings(
      [shortcut('command-palette', ['mod+k']), shortcut('list-next', ['j'])],
      { 'command-palette': 'mod+j' },
    )
    expect(bound[0]?.keys).toEqual(['mod+j'])
    expect(bound[1]?.keys).toEqual(['j'])
  })

  it('stores the action, so the map survives whatever the combination becomes', () => {
    const once = withBinding({}, 'command-palette', 'Mod+J')
    expect(once).toEqual({ 'command-palette': 'mod+j' })
    const twice = withBinding(once, 'command-palette', 'mod+u')
    expect(twice).toEqual({ 'command-palette': 'mod+u' })
    expect(withoutBinding(twice, 'command-palette')).toEqual({})
  })
})

describe('recording a combination', () => {
  it('ignores a modifier pressed on its own', () => {
    expect(isModifierOnly(press('Control', { ctrlKey: true }))).toBe(true)
    expect(isModifierOnly(press('k'))).toBe(false)
    expect(captureCombo(press('Shift', { shiftKey: true }), null)).toBeNull()
  })

  it('turns a keypress into the stored form', () => {
    expect(captureCombo(press('K', { metaKey: true }), null)).toBe('mod+k')
    expect(captureCombo(press('ArrowDown'), null)).toBe('arrowdown')
  })

  it('joins the second key of a chord onto the first', () => {
    expect(captureCombo(press('e'), 'g')).toBe('g e')
  })
})
