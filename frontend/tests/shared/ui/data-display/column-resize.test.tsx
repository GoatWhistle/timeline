import { fireEvent, screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { i18n, i18nReady } from '@/shared/i18n/config'
import {
  ResizableHead,
  ResizableTable,
  type TableColumn,
} from '@/shared/ui/data-display/column-resize/resizable-table'
import { MIN_COLUMN_WIDTH } from '@/shared/ui/data-display/column-resize/use-column-widths'
import { TableBody, TableCell, TableHeader, TableRow } from '@/shared/ui/data-display/table'

const KEY = 'test-table-widths'

const COLUMNS: TableColumn[] = [
  { id: 'select', width: 44, fixed: true },
  { id: 'name', width: 240 },
  { id: 'kind', width: 110 },
  { id: 'state', width: 120 },
]

beforeAll(async () => {
  await i18nReady
  await i18n.changeLanguage('en')
})

beforeEach(() => localStorage.clear())

function draw(onSort = vi.fn()) {
  return {
    onSort,
    ...renderWithProviders(
      <ResizableTable storageKey={KEY} columns={COLUMNS} flexible="name">
        <TableHeader>
          <TableRow>
            <th />
            <ResizableHead column="name" label="Name" />
            <ResizableHead
              column="kind"
              label="Kind"
              sort={{ active: false, order: 'asc', onSort }}
            />
            <ResizableHead column="state" label="State" />
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell />
            <TableCell data-lead="">Northwind</TableCell>
            <TableCell>Hackathon</TableCell>
            <TableCell>Active</TableCell>
          </TableRow>
        </TableBody>
      </ResizableTable>,
    ),
  }
}

const handle = (label: string) => screen.getByRole('button', { name: `Resize the ${label} column` })

const colWidth = (container: HTMLElement, id: string) =>
  (container.querySelector(`col[data-column="${id}"]`) as HTMLElement).style.width

function drag(label: string, dx: number) {
  const target = handle(label)
  fireEvent.pointerDown(target, { button: 0, clientX: 100, pointerId: 1 })
  fireEvent.pointerMove(target, { clientX: 100 + dx, pointerId: 1 })
  fireEvent.pointerUp(target, { clientX: 100 + dx, pointerId: 1 })
}

describe('a table column is dragged wider or narrower from the edge of its header', () => {
  it('gives every named column a handle, and none to the unnamed checkbox column', () => {
    const { container } = draw()
    for (const label of ['Name', 'Kind', 'State']) expect(handle(label)).toBeTruthy()
    expect(container.querySelectorAll('[data-column-resize]')).toHaveLength(3)
  })

  it('follows the pointer and keeps the width for the next visit', () => {
    const { container, unmount } = draw()
    drag('Kind', 60)
    expect(colWidth(container, 'kind')).toBe('170px')
    expect(JSON.parse(localStorage.getItem(KEY) ?? '{}')).toEqual({ kind: 170 })
    unmount()
    const again = draw()
    expect(colWidth(again.container, 'kind'), 'the width was forgotten').toBe('170px')
  })

  it('never lets a column be squeezed below a readable floor', () => {
    const { container } = draw()
    drag('Kind', -500)
    expect(colWidth(container, 'kind')).toBe(`${MIN_COLUMN_WIDTH}px`)
  })

  it('goes back to the built-in width on a double click', () => {
    const { container } = draw()
    drag('State', 40)
    fireEvent.doubleClick(handle('State'))
    expect(colWidth(container, 'state')).toBe('120px')
    expect(localStorage.getItem(KEY)).toBe('{}')
  })

  it('steps by keyboard: arrows nudge, shift strides, Home restores', () => {
    const { container } = draw()
    const target = handle('Kind')
    fireEvent.keyDown(target, { key: 'ArrowRight' })
    expect(colWidth(container, 'kind')).toBe('126px')
    fireEvent.keyDown(target, { key: 'ArrowLeft', shiftKey: true })
    expect(colWidth(container, 'kind')).toBe('64px')
    fireEvent.keyDown(target, { key: 'Home' })
    expect(colWidth(container, 'kind')).toBe('110px')
  })

  it('leaves the sort alone while the edge is being dragged', () => {
    const { onSort } = draw()
    drag('Kind', 30)
    fireEvent.click(handle('Kind'))
    expect(onSort).not.toHaveBeenCalled()
  })

  it('ignores a broken saved width instead of drawing a zero-wide column', () => {
    localStorage.setItem(KEY, JSON.stringify({ kind: -4, state: 'wide', name: 300 }))
    const { container } = draw()
    expect(colWidth(container, 'kind')).toBe('110px')
    expect(colWidth(container, 'state')).toBe('120px')
  })
})

describe('the leading column takes the slack and reads left, the rest sit centred', () => {
  it('lets the leading column grow into free space while the table never shrinks below the sum', () => {
    const { container } = draw()
    expect(colWidth(container, 'name'), 'the leading column was pinned').toBe('')
    expect(colWidth(container, 'select')).toBe('44px')
    const table = container.querySelector('table') as HTMLElement
    expect(table.className).toContain('table-fixed')
    expect(table.style.width).toBe('100%')
    expect(table.style.minWidth).toBe('514px')
  })

  it('counts a widened leading column toward that floor, so dragging it opens a scroll', () => {
    const { container } = draw()
    drag('Name', 100)
    expect((container.querySelector('table') as HTMLElement).style.minWidth).toBe('614px')
  })

  it('sets the leading head left and every other head in the middle', () => {
    draw()
    expect(screen.getByRole('columnheader', { name: /Name/ }).className).toContain('text-left')
    for (const name of [/Kind/, /State/]) {
      expect(screen.getByRole('columnheader', { name }).className).toContain('text-center')
    }
  })

  it('centres every body cell but the one marked as leading', () => {
    const { container } = draw()
    const table = container.querySelector('table') as HTMLElement
    expect(table.className).toContain('[&_tbody_td]:text-center')
    expect(table.className).toContain('[&_tbody_td[data-lead]]:text-left')
    expect(screen.getByText('Northwind').hasAttribute('data-lead')).toBe(true)
  })
})
