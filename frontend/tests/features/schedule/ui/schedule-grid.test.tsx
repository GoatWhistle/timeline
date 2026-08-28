import { screen, within } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it } from 'vitest'
import { STAGE_TYPE_COLOR } from '@/entities/stage/stage.labels'
import { LANE_STEP, LANE_TOP, rowHeight } from '@/features/schedule/model/schedule-scale'
import { ScheduleGrid } from '@/features/schedule/ui/schedule-grid'
import type { ScheduleResponse } from '@/shared/api/types.gen'
import {
  deadlineName,
  eventStateText,
  overlappingStages,
  rowWith,
  schedule,
  stageTypeText,
  track,
} from './schedule-fixtures'

describe('ScheduleGrid', () => {
  it('renders one row per event', () => {
    renderWithProviders(<ScheduleGrid data={schedule} scale="month" />)
    expect(screen.getByRole('link', { name: 'Winter Hackathon' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Spring Meetup' })).toBeInTheDocument()
  })

  it('links to the event page by default', () => {
    renderWithProviders(<ScheduleGrid data={schedule} scale="month" />)
    expect(screen.getByRole('link', { name: 'Winter Hackathon' })).toHaveAttribute(
      'href',
      '/events/e1',
    )
  })

  it('respects the supplied href builder', () => {
    renderWithProviders(
      <ScheduleGrid
        data={schedule}
        scale="month"
        hrefBuilder={(row) => `/admin/events/${row.event_id}`}
      />,
    )
    expect(screen.getByRole('link', { name: 'Spring Meetup' })).toHaveAttribute(
      'href',
      '/admin/events/e2',
    )
  })

  it('labels the state and the team role', () => {
    renderWithProviders(<ScheduleGrid data={schedule} scale="month" />)
    expect(screen.getByText(`${eventStateText('ACTIVE')} · Captain`)).toBeInTheDocument()
    expect(screen.getByText(eventStateText('UPCOMING'))).toBeInTheDocument()
  })

  it('draws a bar per stage with an accessible label', () => {
    renderWithProviders(<ScheduleGrid data={schedule} scale="month" />)
    expect(screen.getByRole('link', { name: /^Participant registration\./ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /^Application Review\./ })).toBeInTheDocument()
  })

  it('draws a stage as a range and a deadline as a point', () => {
    const { container } = renderWithProviders(<ScheduleGrid data={schedule} scale="month" />)
    const bars = within(track(container)).getAllByRole('link')
    const deadline = screen.getByRole('button', { name: deadlineName })

    for (const bar of bars) {
      expect(Number.parseFloat(bar.style.width)).toBeGreaterThan(0)
    }
    expect(deadline.style.width).toBe('')
    expect(deadline.className).toContain('w-0.5')
  })

  it('draws the deadline mark only where one is set', () => {
    renderWithProviders(<ScheduleGrid data={schedule} scale="month" />)
    expect(screen.getAllByRole('button', { name: deadlineName })).toHaveLength(1)
  })

  it('gives the deadline mark an enlarged hit area', () => {
    renderWithProviders(<ScheduleGrid data={schedule} scale="month" />)
    const deadline = screen.getByRole('button', { name: deadlineName })
    expect(deadline.className).toContain('before:-left-[9px]')
    expect(deadline.className).toContain('before:-right-[9px]')
  })

  it('spreads overlapping stages across separate lanes', () => {
    const { container } = renderWithProviders(<ScheduleGrid data={schedule} scale="month" />)
    const tops = within(track(container))
      .getAllByRole('link')
      .map((bar) => bar.style.top)
    expect(new Set(tops).size).toBe(2)
  })

  it('grows the row height with the lane count so bars are not clipped', () => {
    const single = renderWithProviders(
      <ScheduleGrid data={rowWith([overlappingStages[0] as never])} scale="month" />,
    )
    const singleHeight = Number.parseFloat(track(single.container).style.height)
    single.unmount()

    const stacked = renderWithProviders(
      <ScheduleGrid data={rowWith(overlappingStages)} scale="month" />,
    )
    const stackedTrack = track(stacked.container)
    const stackedHeight = Number.parseFloat(stackedTrack.style.height)

    expect(singleHeight).toBe(rowHeight(1))
    expect(stackedHeight).toBe(rowHeight(3))
    expect(stackedHeight).toBeGreaterThan(singleHeight)

    const bars = within(stackedTrack).getAllByRole('link')
    expect(new Set(bars.map((bar) => bar.style.top)).size).toBe(3)

    for (const bar of bars) {
      const bottom = Number.parseFloat(bar.style.top) + Number.parseFloat(bar.style.height)
      expect(bottom).toBeLessThanOrEqual(stackedHeight)
    }
  })

  it('stacks lanes by a fixed step below the lane top', () => {
    const { container } = renderWithProviders(
      <ScheduleGrid data={rowWith(overlappingStages)} scale="month" />,
    )
    const tops = within(track(container))
      .getAllByRole('link')
      .map((bar) => Number.parseFloat(bar.style.top))
      .sort((a, b) => a - b)

    expect(tops).toEqual([LANE_TOP, LANE_TOP + LANE_STEP, LANE_TOP + 2 * LANE_STEP])
  })

  it('encodes the stage type with more than colour', () => {
    const { container } = renderWithProviders(<ScheduleGrid data={schedule} scale="month" />)
    const bar = within(track(container)).getByRole('link', { name: /Participant registration/ })

    expect(bar.className).toContain(STAGE_TYPE_COLOR.REGISTRATION)
    expect(bar.querySelector('svg')).toBeInTheDocument()
    expect(bar).toHaveTextContent('Participant registration')
    expect(bar).toHaveAccessibleName(expect.stringContaining(stageTypeText('REGISTRATION')))
  })

  it('keeps the type readable when two stages differ only by colour', () => {
    const { container } = renderWithProviders(
      <ScheduleGrid data={rowWith(overlappingStages)} scale="month" />,
    )
    const bars = within(track(container)).getAllByRole('link')
    const names = bars.map((bar) => bar.getAttribute('aria-label') ?? '')

    expect(new Set(names).size).toBe(bars.length)
    for (const [index, bar] of bars.entries()) {
      expect(names[index]).toMatch(/^\S.*\.\s\S+\.\s/)
      expect(bar.querySelector('svg')).toBeInTheDocument()
    }
  })

  it('describes stages and deadlines with Radix tooltips, not the title attribute', () => {
    const { container } = renderWithProviders(<ScheduleGrid data={schedule} scale="month" />)
    expect(container.querySelector('[title]')).toBeNull()

    const bar = within(track(container)).getAllByRole('link')[0]
    expect(bar).toHaveAttribute('data-state', 'closed')
    expect(screen.getByRole('button', { name: deadlineName })).toHaveAttribute(
      'data-state',
      'closed',
    )
  })

  it('builds month and week grids of different width', () => {
    const month = renderWithProviders(<ScheduleGrid data={schedule} scale="month" />)
    const monthTicks = month.container.querySelectorAll('.leading-9').length
    month.unmount()

    const week = renderWithProviders(<ScheduleGrid data={schedule} scale="week" />)
    const weekTicks = week.container.querySelectorAll('.leading-9').length

    expect(weekTicks).toBeGreaterThan(monthTicks)
  })

  it('pins the label column', () => {
    const { container } = renderWithProviders(<ScheduleGrid data={schedule} scale="month" />)
    const label = container.querySelector('[data-schedule-label]')
    expect(label?.className).toContain('sticky')
    expect(label?.className).toContain('left-0')
  })

  it('survives an event without stages', () => {
    const empty: ScheduleResponse = { range: schedule.range, rows: [] }
    const { container } = renderWithProviders(<ScheduleGrid data={empty} scale="month" />)
    expect(container.querySelectorAll('[data-schedule-track]')).toHaveLength(0)
  })

  it('keeps a row without stages at the single-lane height', () => {
    const { container } = renderWithProviders(<ScheduleGrid data={rowWith([])} scale="month" />)
    expect(Number.parseFloat(track(container).style.height)).toBe(rowHeight(0))
  })
})
