import type { RowItem } from './row-items'
import { timeOf } from './row-items'

export type NavigationAction =
  | { type: 'move'; row: number; item: number }
  | { type: 'today' }
  | { type: 'zoomIn' }
  | { type: 'zoomOut' }
  | { type: 'open' }

export type Cursor = { row: number; item: number }

export type Grid = readonly (readonly RowItem[])[]

export function clampCursor(grid: Grid, cursor: Cursor): Cursor {
  const row = Math.min(Math.max(cursor.row, 0), Math.max(0, grid.length - 1))
  const items = grid[row] ?? []
  const item = Math.min(Math.max(cursor.item, 0), Math.max(0, items.length - 1))
  return { row, item }
}

export function nearestItemInRow(items: readonly RowItem[], at: number): number {
  if (items.length === 0) return 0
  let best = 0
  let bestDistance = Number.POSITIVE_INFINITY
  for (const [index, item] of items.entries()) {
    const distance = Math.abs(timeOf(item) - at)
    if (distance < bestDistance) {
      best = index
      bestDistance = distance
    }
  }
  return best
}

export function resolveKey(key: string, grid: Grid, cursor: Cursor): NavigationAction | undefined {
  const current = clampCursor(grid, cursor)
  const items = grid[current.row] ?? []

  switch (key) {
    case 'ArrowRight':
      return { type: 'move', row: current.row, item: Math.min(current.item + 1, items.length - 1) }
    case 'ArrowLeft':
      return { type: 'move', row: current.row, item: Math.max(current.item - 1, 0) }
    case 'ArrowDown':
      return verticalMove(grid, current, 1)
    case 'ArrowUp':
      return verticalMove(grid, current, -1)
    case 'Home':
      return { type: 'move', row: current.row, item: 0 }
    case 'End':
      return { type: 'move', row: current.row, item: Math.max(0, items.length - 1) }
    case 'Enter':
      return { type: 'open' }
    case 't':
    case 'T':
      return { type: 'today' }
    case '+':
    case '=':
      return { type: 'zoomIn' }
    case '-':
    case '_':
      return { type: 'zoomOut' }
    default:
      return undefined
  }
}

function verticalMove(grid: Grid, cursor: Cursor, delta: number): NavigationAction {
  const row = Math.min(Math.max(cursor.row + delta, 0), Math.max(0, grid.length - 1))
  if (row === cursor.row) return { type: 'move', row: cursor.row, item: cursor.item }
  const source = grid[cursor.row] ?? []
  const anchor = source[cursor.item]
  const target = grid[row] ?? []
  const item = anchor ? nearestItemInRow(target, timeOf(anchor)) : 0
  return { type: 'move', row, item }
}
