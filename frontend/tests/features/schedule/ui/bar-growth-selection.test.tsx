import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it, vi } from 'vitest'
import {
  WRAPPED_MIN_BAR,
  WRAPPED_SHAPE,
  wrappedBarHeight,
  wrappedLaneTop,
  wrappedRowHeight,
} from '@/features/schedule/model/schedule-scale'
import { WrappedGrid } from '@/features/schedule/ui/wrapped-grid/wrapped-grid'
import type { ScheduleResponse, ScheduleRow } from '@/shared/api/types.gen'

const CELL = 120
const FROM = new Date('2026-01-01T00:00:00')
const NOW = new Date('2026-01-15T12:00:00')

function rows(count: number): ScheduleRow[] {
  return Array.from({ length: count }, (_, index) => ({
    event_id: `e${index}`,
    title: `Event ${index}`,
    kind: 'HACKATHON' as const,
    state: 'ACTIVE' as const,
    start_at: '2026-01-13T09:00:00Z',
    end_at: '2026-01-15T18:00:00Z',
    effective_format: 'ONLINE' as const,
    stages: [],
  }))
}

function data(count: number): ScheduleResponse {
  return {
    range: { from: '2026-01-01T00:00:00Z', to: '2026-02-01T00:00:00Z' },
    rows: rows(count),
  }
}

function renderMonth(count: number, props: Record<string, unknown> = {}) {
  const shape = WRAPPED_SHAPE.month
  return renderWithProviders(
    <WrappedGrid
      data={data(count)}
      from={FROM}
      months={shape.months}
      columns={shape.columns}
      minCell={shape.minCell}
      barHeight={shape.barHeight}
      maxBar={shape.maxBar}
      now={NOW}
      {...props}
    />,
  )
}

describe('a bar grows into the room its week row can spare', () => {
  it('makes a lone bar substantially taller than the old fixed strip', () => {
    const alone = wrappedBarHeight(CELL, 20, 1, 56)
    expect(alone).toBeGreaterThan(20)
  })

  it('shrinks the bars as the lanes multiply instead of overflowing the row', () => {
    const one = wrappedBarHeight(CELL, 20, 1, 56)
    const four = wrappedBarHeight(CELL, 20, 4, 56)
    const ten = wrappedBarHeight(CELL, 20, 10, 56)

    expect(one).toBeGreaterThan(four)
    expect(four).toBeGreaterThan(ten)
  })

  it('never thins a bar below the floor that keeps it legible', () => {
    expect(wrappedBarHeight(CELL, 20, 40, 56)).toBe(WRAPPED_MIN_BAR)
  })

  it('never lets a single event become a slab taller than the ceiling', () => {
    expect(wrappedBarHeight(900, 20, 1, 56)).toBeLessThanOrEqual(56)
  })

  it('derives the row height from the same lanes as the bar height, so they cannot fight', () => {
    for (const lanes of [1, 2, 5, 9]) {
      const bar = wrappedBarHeight(CELL, 20, lanes, 56)
      const row = wrappedRowHeight(CELL, 20, lanes, 56)
      const lastLaneBottom = wrappedLaneTop(lanes - 1, bar, 20) + bar
      expect(row).toBeGreaterThanOrEqual(Math.min(lastLaneBottom, CELL))
      expect(row).toBeLessThanOrEqual(CELL)
    }
  })

  it('keeps a gap between lanes so neighbouring bars never appear fused', () => {
    const bar = wrappedBarHeight(CELL, 20, 3, 56)
    expect(wrappedLaneTop(1, bar, 20) - wrappedLaneTop(0, bar, 20)).toBeGreaterThan(bar)
  })
})

describe('selecting an event marks it out among the rest', () => {
  it('marks only the chosen bar as selected', () => {
    const { container } = renderMonth(3, { selectedId: 'e1' })

    const selected = container.querySelectorAll('[data-schedule-item][data-selected="true"]')
    expect(selected).toHaveLength(1)
    expect(selected[0]?.getAttribute('data-schedule-item')).toBe('e1')
  })

  it('tells a screen reader which bar is current, not colour alone', () => {
    const { container } = renderMonth(3, { selectedId: 'e1' })

    const bar = container.querySelector('[data-schedule-item="e1"]')
    expect(bar).toHaveAttribute('aria-current', 'true')
    expect(bar?.textContent).toMatch(/выделено|selected/i)
  })

  it('leaves the unselected bars without the current marker', () => {
    const { container } = renderMonth(3, { selectedId: 'e1' })

    for (const bar of container.querySelectorAll('[data-schedule-item]')) {
      if (bar.getAttribute('data-schedule-item') === 'e1') continue
      expect(bar).not.toHaveAttribute('aria-current')
    }
  })

  it('flags the whole grid as holding a selection so the others can recede', () => {
    const { container } = renderMonth(3, { selectedId: 'e1' })
    expect(container.querySelector('[data-schedule-wrapped]')).toHaveAttribute(
      'data-has-selection',
      'true',
    )
  })

  it('claims no selection at all when none was made', () => {
    const { container } = renderMonth(3)
    expect(container.querySelector('[data-schedule-wrapped]')).toHaveAttribute(
      'data-has-selection',
      'false',
    )
    expect(container.querySelectorAll('[data-selected="true"]')).toHaveLength(0)
  })

  it('selects on a click and leaves opening to the second gesture', async () => {
    const onSelect = vi.fn()
    const onOpenEvent = vi.fn()
    const { container, user } = renderMonth(2, { onSelect, onOpenEvent })

    const bar = container.querySelector<HTMLElement>('[data-schedule-item="e0"]')
    if (bar) await user.click(bar)

    expect(onSelect).toHaveBeenCalledWith('e0')
    expect(onOpenEvent).not.toHaveBeenCalled()
  })

  it('opens on Enter so the keyboard is not left with only the double click', async () => {
    const onOpenEvent = vi.fn()
    const { container, user } = renderMonth(2, { onOpenEvent })

    const bar = container.querySelector<HTMLElement>('[data-schedule-item="e0"]')
    bar?.focus()
    await user.keyboard('{Enter}')

    expect(onOpenEvent).toHaveBeenCalled()
  })

  it('opens on a double click without the first click having cleared the selection', async () => {
    const onOpenEvent = vi.fn()
    const { container, user } = renderMonth(2, { selectedId: 'e0', onOpenEvent })

    const bar = container.querySelector<HTMLElement>('[data-schedule-item="e0"]')
    if (bar) await user.dblClick(bar)

    expect(onOpenEvent).toHaveBeenCalled()
  })

  it('keeps selection separable from the joined state and the focus ring', () => {
    const { container } = renderMonth(3, { selectedId: 'e1' })
    const bar = container.querySelector('[data-schedule-item="e1"]')

    expect(bar).toHaveAttribute('data-selected', 'true')
    expect(bar).toHaveAttribute('data-focused', 'false')
  })
})

describe('the selection can be taken off again', () => {
  it('drops the selection when the selected bar is clicked a second time', async () => {
    const onSelect = vi.fn()
    const { container, user } = renderMonth(2, { selectedId: 'e0', onSelect })

    const bar = container.querySelector<HTMLElement>('[data-schedule-item="e0"]')
    if (bar) await user.click(bar)

    expect(onSelect).toHaveBeenCalledWith(undefined)
  })

  it('moves the selection rather than dropping it when another bar is clicked', async () => {
    const onSelect = vi.fn()
    const { container, user } = renderMonth(2, { selectedId: 'e0', onSelect })

    const other = container.querySelector<HTMLElement>('[data-schedule-item="e1"]')
    if (other) await user.click(other)

    expect(onSelect).toHaveBeenCalledWith('e1')
  })

  it('drops the selection on Escape from the day cell, without a pointer', async () => {
    const onSelect = vi.fn()
    const { container, user } = renderMonth(2, { selectedId: 'e0', onSelect })

    const day = container.querySelector<HTMLElement>('[data-schedule-day][tabindex="0"]')
    day?.focus()
    await user.keyboard('{Escape}')

    expect(onSelect).toHaveBeenCalledWith(undefined)
  })

  it('drops the selection when an empty day cell is clicked', async () => {
    const onSelect = vi.fn()
    const { container, user } = renderMonth(2, { selectedId: 'e0', onSelect })

    const empty = [...container.querySelectorAll<HTMLElement>('[data-schedule-day]')].find(
      (day) => day.dataset.scheduleDayBars === '0',
    )
    if (empty) await user.click(empty)

    expect(onSelect).toHaveBeenCalledWith(undefined)
  })

  it('does not claim a selection was dropped when there was none to drop', async () => {
    const onSelect = vi.fn()
    const { container, user } = renderMonth(2, { onSelect })

    const bar = container.querySelector<HTMLElement>('[data-schedule-item="e0"]')
    if (bar) await user.click(bar)

    expect(onSelect).toHaveBeenCalledWith('e0')
    expect(onSelect).not.toHaveBeenCalledWith(undefined)
  })
})
