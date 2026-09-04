import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it, vi } from 'vitest'
import { WRAPPED_SHAPE } from '@/features/schedule/model/schedule-scale'
import { WrappedGrid } from '@/features/schedule/ui/wrapped-grid/wrapped-grid'
import { NOW, schedule } from './schedule-fixtures'

const MONTH_FROM = new Date('2026-01-01T00:00:00')

const twoOnOneDay = {
  range: schedule.range,
  rows: [
    {
      event_id: 'a',
      title: 'First',
      kind: 'HACKATHON' as const,
      state: 'ACTIVE' as const,
      start_at: '2026-01-13T09:00:00Z',
      end_at: '2026-01-15T18:00:00Z',
      effective_format: 'ONLINE' as const,
      stages: [],
    },
    {
      event_id: 'b',
      title: 'Second',
      kind: 'HACKATHON' as const,
      state: 'ACTIVE' as const,
      start_at: '2026-01-13T09:00:00Z',
      end_at: '2026-01-15T18:00:00Z',
      effective_format: 'ONLINE' as const,
      stages: [],
    },
  ],
}

function renderMonth(props: Record<string, unknown> = {}) {
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
      {...props}
    />,
  )
}

function days(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll('[data-schedule-day]')].filter(
    (element): element is HTMLElement => element instanceof HTMLElement,
  )
}

describe('a keyboard user reaches the bars of a wrapped grid', () => {
  it('names the day with the count of bars it carries', () => {
    const { container } = renderMonth()
    const carrying = days(container).find((day) => Number(day.dataset.scheduleDayBars) > 0)

    expect(carrying).toBeDefined()
    expect(carrying?.getAttribute('aria-label')).toMatch(/event/i)
  })

  it('tells the day cell that Enter reaches its bars', () => {
    const { container } = renderMonth()
    const carrying = days(container).find((day) => Number(day.dataset.scheduleDayBars) > 0)

    expect(carrying?.getAttribute('aria-label')).toMatch(/bars of the day/i)
  })

  it('says nothing about bars on a day that carries none', () => {
    const { container } = renderMonth()
    const empty = days(container).find((day) => day.dataset.scheduleDayBars === '0')

    expect(empty).toBeDefined()
    expect(empty?.getAttribute('aria-label')).not.toMatch(/bars of the day/i)
  })

  it('moves focus from the day cell into its first bar on Enter', async () => {
    const { container, user } = renderMonth()
    const carrying = days(container).find((day) => Number(day.dataset.scheduleDayBars) > 0)
    carrying?.focus()

    await user.keyboard('{Enter}')
    expect(document.activeElement).toHaveAttribute('data-schedule-item')
  })

  it('selects the bar it lands on so the reader is told what is current', async () => {
    const onSelect = vi.fn()
    const { container, user } = renderMonth({ onSelect })
    days(container)
      .find((day) => Number(day.dataset.scheduleDayBars) > 0)
      ?.focus()

    await user.keyboard('{Enter}')
    expect(onSelect).toHaveBeenCalledWith(expect.any(String))
  })

  it('leaves the day cell alone on Enter when it carries no bar at all', async () => {
    const { container, user } = renderMonth()
    const empty = days(container).find((day) => day.dataset.scheduleDayBars === '0')
    empty?.focus()

    await user.keyboard('{Enter}')
    expect(document.activeElement).toBe(empty)
  })

  it('opens the event on Enter once focus sits on the bar', async () => {
    const onOpenEvent = vi.fn()
    const { container, user } = renderMonth({ onOpenEvent })
    days(container)
      .find((day) => Number(day.dataset.scheduleDayBars) > 0)
      ?.focus()

    await user.keyboard('{Enter}')
    await user.keyboard('{Enter}')

    expect(onOpenEvent).toHaveBeenCalled()
  })

  it('returns focus to the day cell on Escape rather than trapping the user in the bars', async () => {
    const { container, user } = renderMonth()
    const carrying = days(container).find((day) => Number(day.dataset.scheduleDayBars) > 0)
    carrying?.focus()

    await user.keyboard('{Enter}')
    await user.keyboard('{Escape}')

    expect(document.activeElement).toBe(carrying)
  })

  it('steps between the bars of one day with the arrows', async () => {
    const { container, user } = renderMonth({ data: twoOnOneDay })
    const carrying = days(container).find((day) => Number(day.dataset.scheduleDayBars) > 1)
    carrying?.focus()

    await user.keyboard('{Enter}')
    const first = (document.activeElement as HTMLElement).dataset.scheduleItem

    await user.keyboard('{ArrowDown}')
    const second = (document.activeElement as HTMLElement).dataset.scheduleItem

    expect(first).toBeDefined()
    expect(second).toBeDefined()
    expect(second).not.toBe(first)
  })

  it('stops at the last bar of the day instead of wrapping round', async () => {
    const { container, user } = renderMonth({ data: twoOnOneDay })
    days(container)
      .find((day) => Number(day.dataset.scheduleDayBars) > 1)
      ?.focus()

    await user.keyboard('{Enter}')
    await user.keyboard('{ArrowDown}')
    const last = (document.activeElement as HTMLElement).dataset.scheduleItem

    await user.keyboard('{ArrowDown}')
    expect((document.activeElement as HTMLElement).dataset.scheduleItem).toBe(last)
  })
})

describe('Home and End reach the edges of the month', () => {
  it('moves focus to the first day of the month on Home', async () => {
    const { container, user } = renderMonth()
    days(container)[10]?.focus()

    await user.keyboard('{Home}')

    expect((document.activeElement as HTMLElement).dataset.scheduleDay).toBe('2026-0-1')
  })

  it('moves focus to the last day of the month on End', async () => {
    const { container, user } = renderMonth()
    days(container)[0]?.focus()

    await user.keyboard('{End}')

    expect((document.activeElement as HTMLElement).dataset.scheduleDay).toBe('2026-0-31')
  })
})
