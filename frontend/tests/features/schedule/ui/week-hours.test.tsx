import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { enUS } from 'date-fns/locale'
import { describe, expect, it, vi } from 'vitest'
import { isAllDaySpan } from '@/features/schedule/model/calendar-items'
import {
  hourWindow,
  packDayColumns,
  RESTING_HOUR_START,
  restingHour,
} from '@/features/schedule/model/pack-lanes'
import { WeekGrid } from '@/features/schedule/ui/week-grid/week-grid'
import {
  entriesForDay,
  timedHeight,
  WEEK_HOUR_HEIGHT,
} from '@/features/schedule/ui/week-grid/week-layout'
import type { ScheduleResponse, ScheduleRow } from '@/shared/api/types.gen'

const WEEK_FROM = new Date('2026-01-05T00:00:00')
const WEEK_TO = new Date('2026-01-11T23:59:59')
const NOW = new Date('2026-01-07T12:00:00')

function row(overrides: Partial<ScheduleRow>): ScheduleRow {
  return {
    event_id: 'e1',
    title: 'Event',
    kind: 'MEETUP',
    state: 'ACTIVE',
    start_at: '2026-01-07T10:00:00Z',
    end_at: '2026-01-07T12:00:00Z',
    effective_format: 'ONLINE',
    stages: [],
    ...overrides,
  }
}

function data(rows: ScheduleRow[]): ScheduleResponse {
  return { range: { from: WEEK_FROM.toISOString(), to: WEEK_TO.toISOString() }, rows }
}

function renderWeek(rows: ScheduleRow[], props: Record<string, unknown> = {}) {
  return renderWithProviders(
    <WeekGrid data={data(rows)} from={WEEK_FROM} to={WEEK_TO} locale={enUS} now={NOW} {...props} />,
  )
}

describe('the week separates all-day events from timed ones', () => {
  it('routes a multi-day hackathon to the all-day band, never onto the hour grid', () => {
    const hackathon = row({
      event_id: 'hack',
      title: 'Winter Hackathon',
      kind: 'HACKATHON',
      start_at: '2026-01-06T09:00:00Z',
      end_at: '2026-01-09T18:00:00Z',
    })

    const { container } = renderWeek([hackathon])

    expect(
      container.querySelector('[data-schedule-band] [data-schedule-item="hack"]'),
    ).not.toBeNull()
    expect(container.querySelector('[data-schedule-column] [data-schedule-item="hack"]')).toBeNull()
  })

  it('routes a two-hour meetup onto the hour grid, never into the all-day band', () => {
    const meetup = row({ event_id: 'meet', title: 'Evening Meetup' })

    const { container } = renderWeek([meetup])

    expect(
      container.querySelector('[data-schedule-column] [data-schedule-item="meet"]'),
    ).not.toBeNull()
    expect(container.querySelector('[data-schedule-band] [data-schedule-item="meet"]')).toBeNull()
  })

  it('judges the zone by real duration, so a meetup running for days joins the band', () => {
    const longMeetup = row({
      kind: 'MEETUP',
      start_at: '2026-01-06T09:00:00Z',
      end_at: '2026-01-09T18:00:00Z',
    })
    expect(isAllDaySpan(longMeetup)).toBe(true)
  })

  it('keeps a short hackathon on the hour grid rather than trusting the kind alone', () => {
    const shortHackathon = row({
      kind: 'HACKATHON',
      start_at: '2026-01-07T10:00:00Z',
      end_at: '2026-01-07T14:00:00Z',
    })
    expect(isAllDaySpan(shortHackathon)).toBe(false)
  })
})

describe('the hour axis holds the whole day, night included', () => {
  it('opens at midnight so a night launch has a row to stand on', () => {
    expect(hourWindow().startHour).toBe(0)
  })

  it('runs to midnight so a hand-in at dawn is not the end of the axis', () => {
    expect(hourWindow().endHour).toBe(24)
  })

  it('draws every hour of the day, not a window cut to the events present', () => {
    const { container } = renderWeek([])
    const labels = [...container.querySelectorAll('[data-schedule-hours] span')].filter((element) =>
      /^\d{2}:00$/.test(element.textContent ?? ''),
    )

    expect(labels.map((element) => element.textContent)).toContain('00:00')
    expect(labels.map((element) => element.textContent)).toContain('05:00')
    expect(labels.map((element) => element.textContent)).toContain('23:00')
  })

  it('rests the scroll on the working morning rather than on the empty night', () => {
    expect(restingHour([], undefined)).toBe(RESTING_HOUR_START)
  })

  it('rests earlier when an event of the week starts before the working morning', () => {
    expect(restingHour([{ startMinute: 3 * 60, endMinute: 5 * 60 }], undefined)).toBe(3)
  })

  it('keeps the current hour in sight when the week holds today', () => {
    expect(restingHour([], 20 * 60)).toBe(RESTING_HOUR_START)
    expect(restingHour([{ startMinute: 23 * 60, endMinute: 24 * 60 }], 2 * 60)).toBe(1)
  })

  it('never rests outside the day it is scrolling within', () => {
    expect(restingHour([{ startMinute: 0, endMinute: 60 }], 0)).toBe(0)
  })
})

describe('the hour grid places and sizes a meetup by its real time', () => {
  it('gives a bar height proportional to its duration', () => {
    expect(timedHeight(10 * 60, 12 * 60)).toBe(2 * WEEK_HOUR_HEIGHT)
  })

  it('drops the empty sliver an event ending at midnight would leave on the next day', () => {
    const midnight = row({ start_at: '2026-01-06T18:00:00Z', end_at: '2026-01-06T21:00:00Z' })
    const spans = [{ id: 'm', row: midnight, startDay: 0, endDay: 1, items: [], marks: [] }]

    expect(entriesForDay(spans, new Date('2026-01-06T12:00:00'))).toHaveLength(1)
    expect(entriesForDay(spans, new Date('2026-01-07T12:00:00'))).toHaveLength(0)
  })

  it('lays two overlapping meetups side by side instead of stacking them', () => {
    const packed = packDayColumns([
      { id: 'a', startMinute: 600, endMinute: 720 },
      { id: 'b', startMinute: 660, endMinute: 780 },
    ])

    expect(packed).toHaveLength(2)
    expect(new Set(packed.map((entry) => entry.column)).size).toBe(2)
    for (const entry of packed) expect(entry.columns).toBe(2)
  })

  it('lets two meetups that do not overlap each take the full width', () => {
    const packed = packDayColumns([
      { id: 'a', startMinute: 540, endMinute: 600 },
      { id: 'b', startMinute: 780, endMinute: 840 },
    ])

    for (const entry of packed) expect(entry.columns).toBe(1)
  })
})

describe('the week view stays reachable and legible', () => {
  it('names the all-day band so its purpose is not left to layout alone', () => {
    renderWeek([])
    expect(screen.getByText('All day and multi-day')).toBeInTheDocument()
  })

  it('opens an event on Enter, so the keyboard is not left behind by the double click', async () => {
    const onOpenEvent = vi.fn()
    const { container, user } = renderWeek([row({ event_id: 'meet' })], { onOpenEvent })

    const bar = container.querySelector<HTMLElement>('[data-schedule-item="meet"]')
    bar?.focus()
    await user.keyboard('{Enter}')

    expect(onOpenEvent).toHaveBeenCalled()
  })
})

describe('the week carries no selection, everything in it being on view already', () => {
  const meetup = row({ event_id: 'm1', title: 'Evening meetup' })

  it('never flags the week frame as holding a selection', () => {
    const { container } = renderWeek([meetup])
    expect(container.querySelector('[data-schedule-week]')).not.toHaveAttribute(
      'data-has-selection',
    )
  })

  it('marks no bar of the hour grid as selected', () => {
    const { container } = renderWeek([meetup])
    expect(container.querySelector('[data-schedule-item="m1"]')).toHaveAttribute(
      'data-selected',
      'false',
    )
  })

  it('marks no bar of the all-day band as selected either', () => {
    const hackathon = row({
      event_id: 'hack',
      kind: 'HACKATHON',
      start_at: '2026-01-06T09:00:00Z',
      end_at: '2026-01-09T18:00:00Z',
    })
    const { container } = renderWeek([hackathon])

    expect(
      container.querySelector('[data-schedule-band] [data-schedule-item="hack"]'),
    ).toHaveAttribute('data-selected', 'false')
  })

  it('ignores a selection pressed on it from outside, the week having no such state', () => {
    const { container } = renderWeek([meetup], { selectedId: 'm1', onSelect: vi.fn() })

    expect(container.querySelector('[aria-current="true"]')).toBeNull()
    expect(container.querySelector('[data-schedule-item="m1"]')).toHaveAttribute(
      'data-selected',
      'false',
    )
  })

  it('leaves Escape alone so it can reach the overlay above the schedule', async () => {
    const { container, user } = renderWeek([meetup])
    const before = container.querySelector('[data-schedule-week]')?.outerHTML

    container.querySelector<HTMLElement>('[data-schedule-item="m1"]')?.focus()
    await user.keyboard('{Escape}')

    expect(container.querySelector('[data-schedule-week]')?.outerHTML).toBe(before)
  })

  it('opens the event on a double click, the single click having nothing to select', async () => {
    const onOpenEvent = vi.fn()
    const { container, user } = renderWeek([meetup], { onOpenEvent })

    const bar = container.querySelector<HTMLElement>('[data-schedule-item="m1"]')
    if (bar) await user.click(bar)
    expect(onOpenEvent).not.toHaveBeenCalled()

    if (bar) await user.dblClick(bar)
    expect(onOpenEvent).toHaveBeenCalled()
  })
})
