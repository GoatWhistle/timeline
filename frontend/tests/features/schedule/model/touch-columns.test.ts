import { describe, expect, it } from 'vitest'
import { DAYS_PER_WEEK } from '@/features/schedule/model/pack-lanes'
import {
  GRID_GAP,
  GRID_PADDING,
  TOUCH_CELL,
  touchColumns,
  WRAPPED_SHAPE,
} from '@/features/schedule/model/schedule-scale'

function cellWidthFor(width: number, columns: number): number {
  const available = width - GRID_PADDING * 2 - GRID_GAP * (columns - 1)
  return available / (columns * DAYS_PER_WEEK)
}

const TABLET_WIDTHS = [768, 820, 834, 1024]

describe('the wrapped grid keeps its day cells tappable on a tablet', () => {
  it('narrows the year to columns whose day cells reach the touch target', () => {
    for (const width of TABLET_WIDTHS) {
      const columns = touchColumns(WRAPPED_SHAPE.year.columns, width, true)
      expect(cellWidthFor(width, columns)).toBeGreaterThanOrEqual(TOUCH_CELL)
    }
  })

  it('narrows the quarter to columns whose day cells reach the touch target', () => {
    for (const width of TABLET_WIDTHS) {
      const columns = touchColumns(WRAPPED_SHAPE.quarter.columns, width, true)
      expect(cellWidthFor(width, columns)).toBeGreaterThanOrEqual(TOUCH_CELL)
    }
  })

  it('never widens past the shape the scale asks for', () => {
    for (const width of [768, 1024, 1440, 2560]) {
      expect(touchColumns(4, width, true)).toBeLessThanOrEqual(4)
      expect(touchColumns(3, width, true)).toBeLessThanOrEqual(3)
    }
  })

  it('always leaves at least one column', () => {
    for (const width of [200, 320, 360]) {
      expect(touchColumns(4, width, true)).toBeGreaterThanOrEqual(1)
    }
  })

  it('leaves a mouse pointer the full desktop shape', () => {
    expect(touchColumns(4, 768, false)).toBe(4)
    expect(touchColumns(3, 768, false)).toBe(3)
    expect(touchColumns(4, 1440, false)).toBe(4)
  })

  it('keeps the desktop shape when the width already affords the touch target', () => {
    expect(touchColumns(4, 1600, true)).toBe(4)
  })
})
