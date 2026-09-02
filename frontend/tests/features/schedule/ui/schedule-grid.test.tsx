import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it } from 'vitest'
import { buildCalendarGrid } from '@/features/schedule/model/calendar-grid'
import { DAYS_PER_WEEK } from '@/features/schedule/model/pack-lanes'
import {
  BAR_HEIGHT,
  LEGACY_BAR_HEIGHT,
  MARK_SIZE,
  MAX_LANES,
} from '@/features/schedule/model/schedule-scale'
import { ScheduleGrid } from '@/features/schedule/ui/schedule-grid/schedule-grid'
import type { ScheduleResponse } from '@/shared/api/types.gen'
import {
  bars,
  crowded,
  eventStateText,
  longRunning,
  marks,
  NOW,
  range,
  rowWith,
  schedule,
  slots,
  stageTypeText,
} from './schedule-fixtures'

function renderGrid(data: ScheduleResponse = schedule, props: Record<string, unknown> = {}) {
  return renderWithProviders(
    <ScheduleGrid data={data} range={range} scale="month" now={NOW} {...props} />,
  )
}

describe('ScheduleGrid', () => {
  it('lays the range out as weeks of seven days', () => {
    const { container } = renderGrid()
    const weeks = container.querySelectorAll('[data-schedule-week]')
    const grid = buildCalendarGrid(new Date(range.from), new Date(range.to))

    expect(weeks).toHaveLength(grid.weekCount)
    for (const week of weeks) {
      expect(week.querySelectorAll('[data-schedule-day]')).toHaveLength(DAYS_PER_WEEK)
    }
  })

  it('numbers the days consecutively across the whole grid', () => {
    const { container } = renderGrid()
    const days = [...container.querySelectorAll('[data-schedule-day]')].map((day) =>
      Number((day as HTMLElement).dataset.scheduleDay),
    )
    expect(days).toEqual(days.map((_, index) => index))
  })

  it('draws one bar per event carrying its title', () => {
    const { container } = renderGrid()
    const titles = bars(container).map((bar) => bar.textContent?.trim())
    expect(titles.some((title) => title?.includes('Winter Hackathon'))).toBe(true)
    expect(titles.some((title) => title?.includes('Spring Meetup'))).toBe(true)
  })

  it('runs a bar through the days it covers rather than a single cell', () => {
    const { container } = renderGrid()
    const slot = slots(container).find((element) =>
      element.textContent?.includes('Winter Hackathon'),
    )
    const oneDay = 100 / 7
    expect(Number.parseFloat(slot?.style.width.replace(/[^\d.]/g, '') ?? '0')).toBeGreaterThan(
      oneDay + 0.5,
    )
  })

  it('breaks an event crossing a week onto the next row', () => {
    const { container } = renderGrid(longRunning)
    const segments = bars(container).filter((bar) => bar.dataset.scheduleItem === 'e1')
    expect(segments.length).toBeGreaterThan(1)

    const weeks = segments.map((segment) =>
      segment.closest('[data-schedule-week]')?.getAttribute('data-schedule-week'),
    )
    expect(new Set(weeks).size).toBe(segments.length)
  })

  it('marks the cut edges of a continued bar instead of ending it silently', () => {
    const { container } = renderGrid(longRunning)
    const segments = bars(container).filter((bar) => bar.dataset.scheduleItem === 'e1')
    const first = segments[0]
    const last = segments[segments.length - 1]

    expect(first?.dataset.clippedEnd).toBe('true')
    expect(first?.dataset.clippedStart).toBe('false')
    expect(last?.dataset.clippedStart).toBe('true')
    expect(last?.dataset.clippedEnd).toBe('false')
  })

  it('gives every bar the height of its scale', () => {
    const { container } = renderGrid()
    for (const slot of slots(container)) {
      expect(slot.style.getPropertyValue('--bar-height')).toBe(`${BAR_HEIGHT.month}px`)
    }
  })

  it('gives a bar at least twice the height it used to have', () => {
    for (const scale of ['week', 'month', 'quarter'] as const) {
      expect(BAR_HEIGHT[scale]).toBeGreaterThanOrEqual(2 * LEGACY_BAR_HEIGHT[scale])
    }
  })

  it('puts the checkpoint and deadline marks on the bar itself', () => {
    const { container } = renderGrid()
    const carrying = slots(container).filter((slot) => marks(slot).length > 0)
    expect(carrying.length).toBeGreaterThan(0)
    for (const slot of carrying) {
      expect(slot.querySelector('[data-schedule-item]')?.getAttribute('data-schedule-item')).toBe(
        'e1',
      )
    }
  })

  it('keeps a mark a fixed size rather than scaling it with the bar', () => {
    const { container } = renderGrid()
    for (const mark of container.querySelectorAll('[data-schedule-mark]')) {
      expect((mark as HTMLElement).style.getPropertyValue('--mark-size')).toBe(`${MARK_SIZE}px`)
    }
  })

  it('places a mark by its share of the bar, inside the bar', () => {
    const { container } = renderGrid()
    for (const mark of container.querySelectorAll('[data-schedule-mark]')) {
      const percent = Number.parseFloat((mark as HTMLElement).style.left)
      expect(percent).toBeGreaterThanOrEqual(0)
      expect(percent).toBeLessThanOrEqual(100)
    }
  })

  it('encodes the stage type with an icon and text, not colour alone', () => {
    const { container } = renderGrid()
    const bar = bars(container).find((element) => element.textContent?.includes('Winter Hackathon'))

    expect(bar?.querySelector('svg')).toBeInTheDocument()
    expect(bar?.textContent).toContain('Winter Hackathon')
    expect(bar).toHaveAccessibleName(expect.stringContaining('Winter Hackathon'))
  })

  it('names the state in the accessible sentence', () => {
    const { container } = renderGrid()
    const bar = bars(container).find((element) => element.textContent?.includes('Winter Hackathon'))
    expect(bar?.getAttribute('aria-label')).toContain(eventStateText('ACTIVE'))
  })

  it('names the stage type in the accessible sentence', () => {
    const { container } = renderGrid()
    const bar = bars(container).find((element) => element.textContent?.includes('Winter Hackathon'))
    expect(bar?.getAttribute('aria-label')).toContain(stageTypeText('REGISTRATION'))
  })

  it('collapses a crowded week to the lane budget and offers the rest', () => {
    const { container } = renderGrid(crowded, { scale: 'month' })
    const overflow = container.querySelector('[data-schedule-overflow]')

    expect(overflow).toBeInTheDocument()
    expect(bars(container).length).toBeLessThanOrEqual(MAX_LANES.month)
  })

  it('reveals the hidden events when the overflow control is used', async () => {
    const { container, user } = renderGrid(crowded, { scale: 'month' })
    const before = bars(container).length
    const overflow = container.querySelector('[data-schedule-overflow]') as HTMLElement

    await user.click(overflow)

    expect(bars(container).length).toBeGreaterThan(before)
    expect(container.querySelector('[data-schedule-overflow]')).toBeNull()
  })

  it('shows no overflow control when every event fits', () => {
    const { container } = renderGrid()
    expect(container.querySelector('[data-schedule-overflow]')).toBeNull()
  })

  it('describes stages with Radix tooltips, not the title attribute', () => {
    const { container } = renderGrid()
    expect(container.querySelector('[title]')).toBeNull()
    expect(bars(container)[0]).toHaveAttribute('data-state', 'closed')
  })

  it('marks an event with no stage information by outline, not by colour', () => {
    const data = rowWith([])
    const { container } = renderGrid(data)
    const bar = bars(container)[0]

    expect(bar).toHaveAttribute('data-unconfirmed', 'true')
    expect(bar?.className).not.toContain('bg-stage-')
  })

  it('marks the day that is today', () => {
    const { container } = renderGrid()
    expect(container.querySelectorAll('[data-today="true"]')).toHaveLength(1)
  })

  it('greys the days falling outside the requested range', () => {
    const { container } = renderGrid()
    expect(container.querySelectorAll('[data-in-range="false"]').length).toBeGreaterThan(0)
  })

  it('survives a schedule with no events', () => {
    const empty: ScheduleResponse = { range: schedule.range, rows: [] }
    const { container } = renderGrid(empty)
    expect(bars(container)).toHaveLength(0)
    expect(container.querySelectorAll('[data-schedule-week]').length).toBeGreaterThan(0)
  })

  it('shortens the bars as the scale widens', () => {
    const week = renderGrid(schedule, { scale: 'week' })
    const weekHeight = slots(week.container)[0]?.style.getPropertyValue('--bar-height')
    week.unmount()

    const quarter = renderGrid(schedule, { scale: 'quarter' })
    const quarterHeight = slots(quarter.container)[0]?.style.getPropertyValue('--bar-height')

    expect(Number.parseInt(weekHeight ?? '0', 10)).toBeGreaterThan(
      Number.parseInt(quarterHeight ?? '0', 10),
    )
  })

  it('labels the weekday columns once, above the grid', () => {
    const { container } = renderGrid()
    const headers = container.querySelectorAll('[aria-hidden="true"] > span')
    expect(headers.length).toBeGreaterThanOrEqual(DAYS_PER_WEEK)
  })

  it('links a bar to its event through navigation rather than an anchor', () => {
    const { container } = renderGrid()
    expect(screen.queryByRole('link', { name: 'Winter Hackathon' })).toBeNull()
    expect(bars(container)[0]?.tagName).toBe('BUTTON')
  })
})
