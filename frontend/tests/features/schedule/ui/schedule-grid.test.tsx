import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { differenceInCalendarDays } from 'date-fns'
import { describe, expect, it } from 'vitest'
import {
  BAR_HEIGHT,
  fittedDayWidth,
  MARK_SIZE,
  MAX_LANES,
} from '@/features/schedule/model/schedule-scale'
import { ScheduleGrid } from '@/features/schedule/ui/schedule-grid/schedule-grid'
import type { ScheduleResponse } from '@/shared/api/types.gen'
import {
  bars,
  crowded,
  DAY_WIDTH_MONTH,
  eventStateText,
  GRID_FROM,
  GRID_TO,
  gridProps,
  longRunning,
  marks,
  NOW,
  rowWith,
  schedule,
  slots,
  stageTypeText,
} from './schedule-fixtures'

function renderGrid(data: ScheduleResponse = schedule, props: Record<string, unknown> = {}) {
  return renderWithProviders(<ScheduleGrid data={data} {...gridProps} now={NOW} {...props} />)
}

describe('ScheduleGrid', () => {
  it('draws one bar per event carrying its title', () => {
    const { container } = renderGrid()
    const titles = bars(container).map((bar) => bar.textContent?.trim())
    expect(titles.some((title) => title?.includes('Winter Hackathon'))).toBe(true)
    expect(titles.some((title) => title?.includes('Spring Meetup'))).toBe(true)
  })

  it('runs a bar across the days it covers rather than a single day', () => {
    const { container } = renderGrid()
    const slot = slots(container).find((element) =>
      element.textContent?.includes('Winter Hackathon'),
    )
    expect(Number.parseFloat(slot?.style.width ?? '0')).toBeGreaterThan(DAY_WIDTH_MONTH)
  })

  it('draws an event crossing many weeks as one continuous bar, not one per week', () => {
    const { container } = renderGrid(longRunning)
    const segments = bars(container).filter((bar) => bar.dataset.scheduleItem === 'e1')
    expect(segments).toHaveLength(1)
  })

  it('sizes the canvas as one day-width per day of the range', () => {
    const { container } = renderGrid()
    const canvas = container.querySelector('[data-schedule-viewport]') as HTMLElement
    const days = differenceInCalendarDays(GRID_TO, GRID_FROM) + 1

    expect(Number.parseFloat(canvas.style.width)).toBe(days * DAY_WIDTH_MONTH)
  })

  it('grows the canvas sideways, not downwards, as the range lengthens', () => {
    const short = renderGrid(schedule, { to: new Date('2026-01-20T00:00:00Z') })
    const shortCanvas = short.container.querySelector('[data-schedule-viewport]') as HTMLElement
    const shortWidth = Number.parseFloat(shortCanvas.style.width)
    const shortHeight = Number.parseFloat(shortCanvas.style.height)
    short.unmount()

    const long = renderGrid(schedule, { to: new Date('2026-06-01T00:00:00Z') })
    const longCanvas = long.container.querySelector('[data-schedule-viewport]') as HTMLElement

    expect(Number.parseFloat(longCanvas.style.width)).toBeGreaterThan(shortWidth)
    expect(Number.parseFloat(longCanvas.style.height)).toBe(shortHeight)
  })

  it('places each bar at the pixel offset of the day it starts on', () => {
    const { container } = renderGrid()
    for (const slot of slots(container)) {
      const left = Number.parseFloat(slot.style.left)
      expect(Number.isFinite(left)).toBe(true)
      expect(left % DAY_WIDTH_MONTH).toBeCloseTo(0, 5)
    }
  })

  it('gives every bar the height of its scale', () => {
    const { container } = renderGrid()
    for (const slot of slots(container)) {
      expect(slot.style.getPropertyValue('--bar-height')).toBe(`${BAR_HEIGHT.month}px`)
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

  it('encodes the event kind with an icon and text, not colour alone', () => {
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

  it('holds a crowded stretch to the lane budget and says how many are left out', () => {
    const { container } = renderGrid(crowded)

    expect(bars(container).length).toBeLessThanOrEqual(MAX_LANES)
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

  it('survives a schedule with no events', () => {
    const empty: ScheduleResponse = { range: schedule.range, rows: [] }
    const { container } = renderGrid(empty)
    expect(bars(container)).toHaveLength(0)
    expect(container.querySelector('[data-schedule-viewport]')).toBeInTheDocument()
  })

  it('shortens the bars as the scale widens', () => {
    const week = renderGrid(schedule, { scale: 'week', dayWidth: 128 })
    const weekHeight = slots(week.container)[0]?.style.getPropertyValue('--bar-height')
    week.unmount()

    const year = renderGrid(schedule, { scale: 'year', dayWidth: 4 })
    const yearHeight = slots(year.container)[0]?.style.getPropertyValue('--bar-height')

    expect(Number.parseInt(weekHeight ?? '0', 10)).toBeGreaterThan(
      Number.parseInt(yearHeight ?? '0', 10),
    )
  })

  it('links a bar to its event through navigation rather than an anchor', () => {
    const { container } = renderGrid()
    expect(screen.queryByRole('link', { name: 'Winter Hackathon' })).toBeNull()
    expect(bars(container)[0]?.tagName).toBe('BUTTON')
  })
})

describe('the timeline fills the width it is given', () => {
  it('stretches a fixed scale so the days span the measured viewport', () => {
    expect(fittedDayWidth('week', 128, 1302, 7)).toBeCloseTo(1302 / 7)
  })

  it('never shrinks a day below the width the scale asked for', () => {
    expect(fittedDayWidth('week', 128, 210, 7)).toBe(128)
  })

  it('leaves the freely zoomed scale under the control of the user', () => {
    expect(fittedDayWidth('all', 40, 4000, 7)).toBe(40)
  })
})
