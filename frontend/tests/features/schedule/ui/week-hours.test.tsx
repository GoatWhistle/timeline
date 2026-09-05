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

describe('the hour axis holds the hours a hackathon actually uses', () => {
  it('opens at 06:00 so the dead night is not drawn', () => {
    expect(hourWindow().startHour).toBe(6)
  })

  it('runs to midnight so a hand-in at dawn is not the end of the axis', () => {
    expect(hourWindow().endHour).toBe(24)
  })

  it('draws the 6-to-24 window, not the night hours it was trimmed of', () => {
    const { container } = renderWeek([])
    const labels = [...container.querySelectorAll('[data-schedule-hours] span')].filter((element) =>
      /^\d{2}:00$/.test(element.textContent ?? ''),
    )
    const texts = labels.map((element) => element.textContent)

    expect(texts).toContain('06:00')
    expect(texts).toContain('23:00')
    expect(texts).not.toContain('00:00')
    expect(texts).not.toContain('05:00')
  })

  it('rests the scroll on the working morning rather than on the empty night', () => {
    expect(restingHour([], undefined)).toBe(RESTING_HOUR_START)
  })

  it('rests earlier when an event of the week starts before the working morning, but not before the grid', () => {
    expect(restingHour([{ startMinute: 7 * 60, endMinute: 9 * 60 }], undefined)).toBe(7)
    expect(restingHour([{ startMinute: 3 * 60, endMinute: 5 * 60 }], undefined)).toBe(6)
  })

  it('keeps the current hour in sight when the week holds today', () => {
    expect(restingHour([], 20 * 60)).toBe(RESTING_HOUR_START)
    expect(restingHour([{ startMinute: 23 * 60, endMinute: 24 * 60 }], 9 * 60)).toBe(8)
  })

  it('never rests above the top of the grid even when today starts at dawn', () => {
    expect(restingHour([{ startMinute: 0, endMinute: 60 }], 0)).toBe(6)
  })
})

describe('the hour grid places and sizes a meetup by its real time', () => {
  it('gives a bar height proportional to its duration', () => {
    expect(timedHeight(10 * 60, 12 * 60, 6, 24)).toBe(2 * WEEK_HOUR_HEIGHT)
  })

  it('clamps a pre-dawn start to the top of the grid and flags it as clipped, never dropping it', () => {
    const { container } = renderWeek([
      row({
        event_id: 'dawn',
        start_at: '2026-01-07T05:00:00+03:00',
        end_at: '2026-01-07T07:00:00+03:00',
      }),
    ])
    const bar = container.querySelector('[data-schedule-item="dawn"]')

    expect(bar).not.toBeNull()
    expect(bar).toHaveAttribute('data-clipped-start', 'true')
  })

  it('keeps a late-evening meetup on the grid without clamping it away', () => {
    const { container } = renderWeek([
      row({
        event_id: 'late',
        start_at: '2026-01-07T21:00:00+03:00',
        end_at: '2026-01-07T23:30:00+03:00',
      }),
    ])
    const bar = container.querySelector('[data-schedule-item="late"]')

    expect(bar).not.toBeNull()
    expect(bar).toHaveAttribute('data-clipped-start', 'false')
    expect(bar).toHaveAttribute('data-clipped-end', 'false')
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
