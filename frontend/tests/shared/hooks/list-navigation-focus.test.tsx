import { renderWithProviders } from '@tests/support/render'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { useListNavigation } from '@/shared/hooks/use-list-navigation/use-list-navigation'
import { ShortcutProvider } from '@/shared/keyboard/shortcut-registry'

const IDS = ['alpha', 'beta', 'gamma']

function List() {
  const [selected, setSelected] = useState<string | null>(null)

  useListNavigation({
    ids: IDS,
    selected,
    onSelect: setSelected,
    onClear: () => setSelected(null),
    scopeId: 'test-list',
  })

  return (
    <div role="listbox" aria-label="rows">
      {IDS.map((id) => (
        <button
          key={id}
          type="button"
          role="option"
          aria-selected={id === selected}
          data-event-row={id}
          onClick={() => setSelected(id)}
        >
          {id}
        </button>
      ))}
    </div>
  )
}

function renderList() {
  return renderWithProviders(
    <ShortcutProvider>
      <List />
    </ShortcutProvider>,
  )
}

function activeRow(): string | null {
  const active = document.activeElement
  if (!(active instanceof HTMLElement)) return null
  return active.getAttribute('data-event-row')
}

function selectedRow(container: HTMLElement): string | null {
  const row = container.querySelector('[role="option"][aria-selected="true"]')
  return row?.getAttribute('data-event-row') ?? null
}

function TableList() {
  const [selected, setSelected] = useState<string | null>(null)

  useListNavigation({
    ids: IDS,
    selected,
    onSelect: setSelected,
    scopeId: 'test-table',
  })

  return (
    <table>
      <tbody>
        {IDS.map((id) => (
          <tr key={id} data-event-row={id} aria-selected={id === selected}>
            <td>
              <button type="button" onClick={() => setSelected(id)}>
                {id}
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

describe('a table whose rows cannot themselves hold focus', () => {
  it('focuses the control inside the row rather than nothing at all', async () => {
    const { user } = renderWithProviders(
      <ShortcutProvider>
        <TableList />
      </ShortcutProvider>,
    )
    document.body.focus()

    await user.keyboard('j')

    const active = document.activeElement
    expect(active).toBeInstanceOf(HTMLButtonElement)
    expect(active?.closest('[data-event-row]')?.getAttribute('data-event-row')).toBe('alpha')
  })

  it('carries focus along as the selection steps down the table', async () => {
    const { user } = renderWithProviders(
      <ShortcutProvider>
        <TableList />
      </ShortcutProvider>,
    )
    document.body.focus()

    await user.keyboard('j')
    await user.keyboard('j')

    expect(document.activeElement?.closest('[data-event-row]')).toHaveAttribute(
      'data-event-row',
      'beta',
    )
  })
})

describe('list keyboard navigation moves focus, not only selection', () => {
  it('focuses the first row when entering the list from outside it', async () => {
    const { user, container } = renderList()
    document.body.focus()

    await user.keyboard('j')

    expect(selectedRow(container)).toBe('alpha')
    expect(activeRow()).toBe('alpha')
  })

  it('keeps focus on the selected row while stepping down', async () => {
    const { user, container } = renderList()
    document.body.focus()

    await user.keyboard('j')
    await user.keyboard('j')

    expect(selectedRow(container)).toBe('beta')
    expect(activeRow()).toBe('beta')
  })

  it('keeps focus on the selected row while stepping up', async () => {
    const { user, container } = renderList()
    document.body.focus()

    await user.keyboard('{ArrowUp}')

    expect(selectedRow(container)).toBe('gamma')
    expect(activeRow()).toBe('gamma')
  })

  it('follows the arrow keys as well as j and k', async () => {
    const { user, container } = renderList()
    document.body.focus()

    await user.keyboard('{ArrowDown}')
    expect(activeRow()).toBe('alpha')

    await user.keyboard('{ArrowDown}')
    expect(selectedRow(container)).toBe('beta')
    expect(activeRow()).toBe('beta')

    await user.keyboard('k')
    expect(selectedRow(container)).toBe('alpha')
    expect(activeRow()).toBe('alpha')
  })

  it('never leaves the selected row unannounced: focus and selection agree at every step', async () => {
    const { user, container } = renderList()
    document.body.focus()

    for (const expected of ['alpha', 'beta', 'gamma']) {
      await user.keyboard('j')
      expect(selectedRow(container)).toBe(expected)
      expect(activeRow()).toBe(expected)
    }
  })
})
