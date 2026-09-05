import { renderWithProviders } from '@tests/support/render'
import { enUS } from 'date-fns/locale'
import { describe, expect, it, vi } from 'vitest'
import { WeekGrid } from '@/features/schedule/ui/week-grid/week-grid'
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
