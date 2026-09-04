import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it } from 'vitest'
import {
  WRAPPED_SHAPE,
  wrappedBarHeight,
  wrappedLaneTop,
  wrappedRowHeight,
} from '@/features/schedule/model/schedule-scale'
import { WrappedGrid } from '@/features/schedule/ui/wrapped-grid/wrapped-grid'
import { NOW, schedule } from './schedule-fixtures'

const MONTH_FROM = new Date('2026-01-01T00:00:00')
const CELL = 76

function renderMonth() {
  const shape = WRAPPED_SHAPE.month
  return renderWithProviders(
    <WrappedGrid
      data={schedule}
      from={MONTH_FROM}
      months={shape.months}
      columns={shape.columns}
      minCell={shape.minCell}
      barHeight={shape.barHeight}
      maxBar={shape.maxBar}
      now={NOW}
    />,
  )
}

describe('a week row publishes the height its lanes need', () => {
  it('sets the row height custom property on every week of the month', () => {
    const { container } = renderMonth()
    const weeks = [...container.querySelectorAll('[data-schedule-month] > div')].filter(
      (element): element is HTMLElement =>
        element instanceof HTMLElement && element.querySelector('[data-schedule-day]') !== null,
    )

    expect(weeks.length).toBeGreaterThan(0)
    for (const week of weeks) {
      expect(week.style.getPropertyValue('--week-row-height')).toMatch(/^\d+px$/)
    }
  })

  it('never asks for a row shorter than the lanes stacked inside it', () => {
    for (const lanes of [1, 2, 3, 5, 9]) {
      const bar = wrappedBarHeight(CELL, 20, lanes, 56)
      const needed = wrappedLaneTop(lanes - 1, bar, 20) + bar
      expect(wrappedRowHeight(CELL, 20, lanes, 56)).toBeGreaterThanOrEqual(Math.min(needed, CELL))
    }
  })
})
