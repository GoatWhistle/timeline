import { describe, expect, it } from 'vitest'
import type { RowItem } from '@/features/schedule/model/row-items'
import {
  clampCursor,
  type Grid,
  nearestItemInRow,
  resolveKey,
} from '@/features/schedule/model/row-navigation'

function moment(id: string, at: string): RowItem {
  return { kind: 'moment', id, moment: 'checkpoint', at, name: id }
}

const ROW_A: RowItem[] = [
  moment('a0', '2026-01-01T00:00:00Z'),
  moment('a1', '2026-01-10T00:00:00Z'),
  moment('a2', '2026-01-20T00:00:00Z'),
]

const ROW_B: RowItem[] = [
  moment('b0', '2026-01-09T00:00:00Z'),
  moment('b1', '2026-02-01T00:00:00Z'),
]

const GRID: Grid = [ROW_A, ROW_B, []]

describe('clampCursor', () => {
  it('keeps a valid cursor', () => {
    expect(clampCursor(GRID, { row: 1, item: 1 })).toEqual({ row: 1, item: 1 })
  })

  it('clamps beyond the last row and item', () => {
    expect(clampCursor(GRID, { row: 99, item: 99 })).toEqual({ row: 2, item: 0 })
  })

  it('clamps negatives to zero', () => {
    expect(clampCursor(GRID, { row: -5, item: -5 })).toEqual({ row: 0, item: 0 })
  })

  it('survives an empty grid', () => {
    expect(clampCursor([], { row: 3, item: 3 })).toEqual({ row: 0, item: 0 })
  })
})

describe('resolveKey', () => {
  it('moves right and left along the row', () => {
    expect(resolveKey('ArrowRight', GRID, { row: 0, item: 0 })).toEqual({
      type: 'move',
      row: 0,
      item: 1,
    })
    expect(resolveKey('ArrowLeft', GRID, { row: 0, item: 2 })).toEqual({
      type: 'move',
      row: 0,
      item: 1,
    })
  })

  it('stops at the ends rather than wrapping', () => {
    expect(resolveKey('ArrowLeft', GRID, { row: 0, item: 0 })).toEqual({
      type: 'move',
      row: 0,
      item: 0,
    })
    expect(resolveKey('ArrowRight', GRID, { row: 0, item: 2 })).toEqual({
      type: 'move',
      row: 0,
      item: 2,
    })
  })

  it('keeps the same position in time when moving between rows', () => {
    expect(resolveKey('ArrowDown', GRID, { row: 0, item: 1 })).toEqual({
      type: 'move',
      row: 1,
      item: 0,
    })
    expect(resolveKey('ArrowUp', GRID, { row: 1, item: 1 })).toEqual({
      type: 'move',
      row: 0,
      item: 2,
    })
  })

  it('jumps to the first and last item of the row', () => {
    expect(resolveKey('Home', GRID, { row: 0, item: 2 })).toEqual({ type: 'move', row: 0, item: 0 })
    expect(resolveKey('End', GRID, { row: 0, item: 0 })).toEqual({ type: 'move', row: 0, item: 2 })
  })

  it('maps Enter to open, t to today and plus or minus to zoom', () => {
    expect(resolveKey('Enter', GRID, { row: 0, item: 0 })).toEqual({ type: 'open' })
    expect(resolveKey('t', GRID, { row: 0, item: 0 })).toEqual({ type: 'today' })
    expect(resolveKey('T', GRID, { row: 0, item: 0 })).toEqual({ type: 'today' })
    expect(resolveKey('+', GRID, { row: 0, item: 0 })).toEqual({ type: 'zoomIn' })
    expect(resolveKey('-', GRID, { row: 0, item: 0 })).toEqual({ type: 'zoomOut' })
  })

  it('ignores an unhandled key', () => {
    expect(resolveKey('q', GRID, { row: 0, item: 0 })).toBeUndefined()
  })

  it('lands on item zero when moving into an empty row', () => {
    expect(resolveKey('ArrowDown', GRID, { row: 1, item: 1 })).toEqual({
      type: 'move',
      row: 2,
      item: 0,
    })
  })
})

describe('nearestItemInRow', () => {
  it('returns zero for an empty row', () => {
    expect(nearestItemInRow([], 0)).toBe(0)
  })

  it('picks the item closest in time', () => {
    const items = ROW_A
    expect(nearestItemInRow(items, new Date('2026-01-09T00:00:00Z').getTime())).toBe(1)
    expect(nearestItemInRow(items, new Date('2027-01-01T00:00:00Z').getTime())).toBe(2)
  })
})
