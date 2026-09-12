import { describe, expect, it, vi } from 'vitest'
import {
  isInteractiveTarget,
  type ShortcutDefinition,
  ShortcutRegistry,
} from '@/shared/keyboard/shortcut-registry'

function shortcut(id: string, keys: string[], run: () => void): ShortcutDefinition {
  return { id, keys, titleKey: `shortcut.${id}`, group: 'list', run }
}

function press(key: string) {
  return { key, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false }
}

function listRegistry(run: () => void): ShortcutRegistry {
  const registry = new ShortcutRegistry()
  registry.push({ id: 'list', mode: 'normal', shortcuts: [shortcut('next', ['j'], run)] })
  return registry
}

const ROW_SELECTOR = '[data-event-row], [data-inbox-row]'
const inRow = (selector: string) => (selector === ROW_SELECTOR ? {} : null)

describe('a list row is the navigation surface, not a type-ahead target', () => {
  it('exempts the row itself from type-ahead suppression', () => {
    const row = { tagName: 'BUTTON', dataset: { eventRow: 'ev_1' }, getAttribute: () => null }
    expect(isInteractiveTarget(row)).toBe(false)
  })

  it('steps the list from a focused row instead of swallowing the key', () => {
    const run = vi.fn()

    listRegistry(run).handle(press('j'), {
      tagName: 'BUTTON',
      dataset: { eventRow: 'ev_1' },
      getAttribute: () => null,
    })
    expect(run).toHaveBeenCalledOnce()
  })

  it('exempts a control sitting inside a row, such as a table cell button', () => {
    const cellButton = {
      tagName: 'BUTTON',
      dataset: {},
      closest: inRow,
      getAttribute: () => null,
    }
    expect(isInteractiveTarget(cellButton)).toBe(false)
  })

  it('steps the list from a control nested in a row', () => {
    const run = vi.fn()

    listRegistry(run).handle(press('j'), {
      tagName: 'BUTTON',
      dataset: {},
      closest: inRow,
      getAttribute: () => null,
    })
    expect(run).toHaveBeenCalledOnce()
  })

  it('exempts an inbox row from type-ahead suppression the same way', () => {
    const row = { tagName: 'BUTTON', dataset: { inboxRow: 'ib_1' }, getAttribute: () => null }
    expect(isInteractiveTarget(row)).toBe(false)
  })

  it('exempts a control nested inside an inbox row, such as its checkbox', () => {
    const checkbox = {
      tagName: 'BUTTON',
      dataset: {},
      closest: inRow,
      getAttribute: () => 'checkbox',
    }
    expect(isInteractiveTarget(checkbox)).toBe(false)
  })
})

describe('the exemption never reaches a field someone is typing into', () => {
  it('keeps suppressing type-ahead on a plain button that is not a list row', () => {
    const run = vi.fn()

    listRegistry(run).handle(press('j'), {
      tagName: 'BUTTON',
      dataset: {},
      getAttribute: () => null,
    })
    expect(run).not.toHaveBeenCalled()
  })

  it('refuses to fire from a text field even when the row attribute is present', () => {
    const run = vi.fn()

    listRegistry(run).handle(press('j'), {
      tagName: 'INPUT',
      dataset: { eventRow: 'ev_1' },
      getAttribute: () => null,
    })
    expect(run).not.toHaveBeenCalled()
  })

  it('refuses to fire from a text field nested inside a list row', () => {
    const run = vi.fn()

    listRegistry(run).handle(press('j'), {
      tagName: 'INPUT',
      dataset: {},
      closest: inRow,
      getAttribute: () => null,
    })
    expect(run).not.toHaveBeenCalled()
  })

  it('refuses to fire from a textarea nested inside a list row', () => {
    const run = vi.fn()

    listRegistry(run).handle(press('j'), {
      tagName: 'TEXTAREA',
      dataset: {},
      closest: inRow,
      getAttribute: () => null,
    })
    expect(run).not.toHaveBeenCalled()
  })
})
