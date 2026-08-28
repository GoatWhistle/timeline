import { screen, within } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it } from 'vitest'
import { STAGE_TYPE_COLOR } from '@/entities/stage/stage.labels'
import {
  BAR_HEIGHT,
  DIAMOND_SIZE,
  laneTop,
  ROW_PITCH,
  rowHeight,
} from '@/features/schedule/model/schedule-scale'
import { ScheduleGrid } from '@/features/schedule/ui/schedule-grid/schedule-grid'
import type { ScheduleResponse } from '@/shared/api/types.gen'
import {
  bars,
  checkpointStage,
  deadlineName,
  eventStateText,
  moments,
  NOW,
  overlappingStages,
  range,
  rowWith,
  schedule,
  stageTypeText,
  track,
} from './schedule-fixtures'

function renderGrid(data: ScheduleResponse = schedule, props: Record<string, unknown> = {}) {
  return renderWithProviders(
    <ScheduleGrid data={data} range={range} scale="month" now={NOW} {...props} />,
  )
}

describe('ScheduleGrid', () => {
  it('renders one row per event', () => {
    renderGrid()
    expect(screen.getByRole('link', { name: 'Winter Hackathon' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Spring Meetup' })).toBeInTheDocument()
  })

  it('links to the event page by default', () => {
    renderGrid()
    expect(screen.getByRole('link', { name: 'Winter Hackathon' })).toHaveAttribute(
      'href',
      '/events/e1',
    )
  })

  it('respects the supplied href builder', () => {
    renderGrid(schedule, {
      hrefBuilder: (row: { event_id: string }) => `/admin/events/${row.event_id}`,
    })
    expect(screen.getByRole('link', { name: 'Spring Meetup' })).toHaveAttribute(
      'href',
      '/admin/events/e2',
    )
  })

  it('labels the state and the team role', () => {
    renderGrid()
    expect(screen.getByText(`${eventStateText('ACTIVE')} · Captain`)).toBeInTheDocument()
    expect(screen.getByText(eventStateText('UPCOMING'))).toBeInTheDocument()
  })

  it('draws a bar per stage with an accessible label', () => {
    renderGrid()
    expect(screen.getByRole('button', { name: /^Participant registration\./ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Application Review\./ })).toBeInTheDocument()
  })

  it('draws a stage as a range and a deadline as a fixed-size diamond', () => {
    const { container } = renderGrid()
    for (const bar of bars(track(container))) {
      expect(Number.parseFloat(bar.style.width)).toBeGreaterThan(0)
    }
    const deadline = screen.getByRole('button', { name: deadlineName })
    expect(deadline.style.getPropertyValue('--diamond-size')).toBe(`${DIAMOND_SIZE}px`)
    expect(deadline.style.width).toBe('')
  })

  it('gives every stage bar the 30px height and the 3px radius', () => {
    const { container } = renderGrid()
    for (const bar of bars(track(container))) {
      expect(bar.style.getPropertyValue('--bar-height')).toBe(`${BAR_HEIGHT}px`)
      expect(bar.style.getPropertyValue('--bar-radius')).toBe('3px')
    }
  })

  it('draws the deadline mark only where one is set', () => {
    renderGrid()
    expect(screen.getAllByRole('button', { name: deadlineName })).toHaveLength(1)
  })

  it('fills the deadline diamond and leaves the checkpoint diamond hollow', () => {
    const { container } = renderGrid(
      rowWith([checkpointStage], { registration_deadline: '2026-01-20T00:00:00Z' }),
    )
    const marks = moments(track(container))
    const hollow = marks.map((mark) => mark.dataset.hollow)
    expect(hollow.sort()).toEqual(['false', 'true'])
  })

  it('spreads overlapping stages across separate lanes at the 48px pitch', () => {
    const { container } = renderGrid(rowWith(overlappingStages))
    const tops = bars(track(container))
      .map((bar) => Number.parseFloat(bar.style.top))
      .sort((a, b) => a - b)
    expect(tops).toEqual([laneTop(0), laneTop(1), laneTop(2)])
    expect(laneTop(1) - laneTop(0)).toBe(ROW_PITCH)
  })

  it('grows the row height with the lane count so bars are not clipped', () => {
    const single = renderGrid(rowWith(overlappingStages.slice(0, 1)))
    const singleHeight = Number.parseFloat(track(single.container).style.height)
    single.unmount()

    const stacked = renderGrid(rowWith(overlappingStages))
    const stackedTrack = track(stacked.container)
    const stackedHeight = Number.parseFloat(stackedTrack.style.height)

    expect(singleHeight).toBe(rowHeight(1))
    expect(stackedHeight).toBe(rowHeight(3))

    for (const bar of bars(stackedTrack)) {
      const bottom = Number.parseFloat(bar.style.top) + BAR_HEIGHT
      expect(bottom).toBeLessThanOrEqual(stackedHeight)
    }
  })

  it('encodes the stage type with more than colour', () => {
    const { container } = renderGrid()
    const bar = within(track(container)).getByRole('button', {
      name: /Participant registration/,
    })

    expect(bar.className).toContain(STAGE_TYPE_COLOR.REGISTRATION)
    expect(bar.querySelector('svg')).toBeInTheDocument()
    expect(bar).toHaveTextContent('Participant registration')
    expect(bar).toHaveAccessibleName(expect.stringContaining(stageTypeText('REGISTRATION')))
  })

  it('describes stages and deadlines with Radix tooltips, not the title attribute', () => {
    const { container } = renderGrid()
    expect(container.querySelector('[title]')).toBeNull()
    expect(bars(track(container))[0]).toHaveAttribute('data-state', 'closed')
  })

  it('builds denser grids as the zoom tightens', () => {
    const quarter = renderGrid(schedule, { scale: 'quarter' })
    const quarterTicks = quarter.container.querySelectorAll('[data-schedule-tick]').length
    quarter.unmount()

    const week = renderGrid(schedule, { scale: 'week' })
    const weekTicks = week.container.querySelectorAll('[data-schedule-tick]').length

    expect(weekTicks).toBeGreaterThan(quarterTicks)
  })

  it('pins the label column', () => {
    const { container } = renderGrid()
    const label = container.querySelector('[data-schedule-label]')
    expect(label?.className).toContain('sticky')
    expect(label?.className).toContain('left-0')
  })

  it('survives an event without stages', () => {
    const empty: ScheduleResponse = { range: schedule.range, rows: [] }
    const { container } = renderGrid(empty)
    expect(container.querySelectorAll('[data-schedule-track]')).toHaveLength(0)
  })

  it('keeps a row without stages at the single-lane height', () => {
    const { container } = renderGrid(rowWith([]))
    expect(Number.parseFloat(track(container).style.height)).toBe(rowHeight(0))
  })
})
