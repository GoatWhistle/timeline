import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { enUS } from 'date-fns/locale'
import { describe, expect, it, vi } from 'vitest'
import { isAllDaySpan } from '@/features/schedule/model/calendar-items'
import { hourWindow, packDayColumns } from '@/features/schedule/model/pack-lanes'
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

describe('the hour axis shows the hours that matter', () => {
  it('opens on the working day rather than on empty night hours', () => {
    expect(hourWindow([]).startHour).toBe(8)
  })

  it('reaches earlier when an event starts before the default opening hour', () => {
    expect(hourWindow([{ startMinute: 6 * 60, endMinute: 7 * 60 }]).startHour).toBe(6)
  })

  it('never clips an event that runs past the default closing hour', () => {
    expect(hourWindow([{ startMinute: 22 * 60, endMinute: 24 * 60 }]).endHour).toBe(24)
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
    expect(screen.getByText(/all day/i)).toBeInTheDocument()
  })

  it('opens an event on Enter, so the keyboard is not left behind by the double click', async () => {
    const onOpenEvent = vi.fn()
    const { container, user } = renderWeek([row({ event_id: 'meet' })], { onOpenEvent })

    const bar = container.querySelector<HTMLElement>('[data-schedule-item="meet"]')
    bar?.focus()
    await user.keyboard('{Enter}')

    expect(onOpenEvent).toHaveBeenCalled()
  })

  it('flags the week frame as holding a selection so the other bars can recede', () => {
    const { container } = renderWeek([row({ event_id: 'meet' })], { selectedId: 'meet' })
    expect(container.querySelector('[data-schedule-week]')).toHaveAttribute(
      'data-has-selection',
      'true',
    )
  })

  it('claims no selection on the week frame when none was made', () => {
    const { container } = renderWeek([row({ event_id: 'meet' })])
    expect(container.querySelector('[data-schedule-week]')).toHaveAttribute(
      'data-has-selection',
      'false',
    )
  })

  it('selects on a single click and opens only on the second gesture', async () => {
    const onSelect = vi.fn()
    const onOpenEvent = vi.fn()
    const { container, user } = renderWeek([row({ event_id: 'meet' })], { onSelect, onOpenEvent })

    const bar = container.querySelector<HTMLElement>('[data-schedule-item="meet"]')
    if (bar) await user.click(bar)

    expect(onSelect).toHaveBeenCalledWith('meet')
    expect(onOpenEvent).not.toHaveBeenCalled()
  })
})

describe('the week view lets the selection be taken off again', () => {
  const meetup = row({ event_id: 'm1', title: 'Evening meetup' })

  it('drops the selection when the selected bar is clicked a second time', async () => {
    const onSelect = vi.fn()
    const { container, user } = renderWeek([meetup], { selectedId: 'm1', onSelect })

    const bar = container.querySelector<HTMLElement>('[data-schedule-item="m1"]')
    if (bar) await user.click(bar)

    expect(onSelect).toHaveBeenCalledWith(undefined)
  })

  it('drops the selection on Escape inside the week frame, without a pointer', async () => {
    const onSelect = vi.fn()
    const { container, user } = renderWeek([meetup], { selectedId: 'm1', onSelect })

    const bar = container.querySelector<HTMLElement>('[data-schedule-item="m1"]')
    bar?.focus()
    await user.keyboard('{Escape}')

    expect(onSelect).toHaveBeenCalledWith(undefined)
  })

  it('leaves Escape alone when nothing is selected, so it can reach an overlay above', async () => {
    const onSelect = vi.fn()
    const { container, user } = renderWeek([meetup], { onSelect })

    const bar = container.querySelector<HTMLElement>('[data-schedule-item="m1"]')
    bar?.focus()
    await user.keyboard('{Escape}')

    expect(onSelect).not.toHaveBeenCalledWith(undefined)
  })

  it('keeps Enter opening the event rather than clearing it', async () => {
    const onOpenEvent = vi.fn()
    const onSelect = vi.fn()
    const { container, user } = renderWeek([meetup], {
      selectedId: 'm1',
      onOpenEvent,
      onSelect,
    })

    const bar = container.querySelector<HTMLElement>('[data-schedule-item="m1"]')
    bar?.focus()
    await user.keyboard('{Enter}')

    expect(onOpenEvent).toHaveBeenCalled()
    expect(onSelect).not.toHaveBeenCalledWith(undefined)
  })

  it('keeps focusing a bar selecting it rather than toggling it away', async () => {
    const onSelect = vi.fn()
    const { container } = renderWeek([meetup], { selectedId: 'm1', onSelect })

    container.querySelector<HTMLElement>('[data-schedule-item="m1"]')?.focus()

    expect(onSelect).toHaveBeenCalledWith('m1')
    expect(onSelect).not.toHaveBeenCalledWith(undefined)
  })
})
