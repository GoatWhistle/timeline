import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it } from 'vitest'
import { WRAPPED_SHAPE, wrappedBarHeight } from '@/features/schedule/model/schedule-scale'
import { WrappedGrid } from '@/features/schedule/ui/wrapped-grid/wrapped-grid'
import type { ScheduleResponse } from '@/shared/api/types.gen'
import { bars, NOW, schedule } from './schedule-fixtures'

const MONTH_FROM = new Date('2026-01-01T00:00:00')

const place = { format: 'ONLINE' as const, inherited: true }

const spanningAndCrowded: ScheduleResponse = {
  range: schedule.range,
  rows: [
    {
      event_id: 'long',
      title: 'Long Marathon',
      kind: 'HACKATHON',
      state: 'ACTIVE',
      start_at: '2026-01-05T00:00:00Z',
      end_at: '2026-01-28T00:00:00Z',
      effective_format: 'ONLINE',
      stages: [],
    },
    ...Array.from({ length: 5 }, (_, index) => ({
      event_id: `c${index}`,
      title: `Crowded ${index}`,
      kind: 'HACKATHON' as const,
      state: 'ACTIVE' as const,
      start_at: '2026-01-12T00:00:00Z',
      end_at: '2026-01-16T00:00:00Z',
      effective_format: 'ONLINE' as const,
      stages: [
        {
          id: `cs${index}`,
          name: `Stage ${index}`,
          type: 'DEMO' as const,
          start_at: '2026-01-12T00:00:00Z',
          end_at: '2026-01-15T00:00:00Z',
          place,
        },
      ],
    })),
  ],
}

function renderMonth(data: ScheduleResponse, months = WRAPPED_SHAPE.month.months) {
  const shape = WRAPPED_SHAPE.month
  return renderWithProviders(
    <WrappedGrid
      data={data}
      from={MONTH_FROM}
      months={months}
      columns={shape.columns}
      minCell={shape.minCell}
      barHeight={shape.barHeight}
      maxBar={shape.maxBar}
      now={NOW}
    />,
  )
}

function barHeightOf(bar: HTMLElement): string {
  const slot = bar.parentElement
  const drawn = slot?.style.getPropertyValue('--bar-height') ?? ''
  if (drawn === '') throw new Error('a bar must publish the height it is drawn at')
  return drawn
}

function heightsById(container: HTMLElement): Map<string, string[]> {
  const found = new Map<string, string[]>()
  for (const bar of bars(container)) {
    const id = bar.getAttribute('data-schedule-item') ?? ''
    const seen = found.get(id) ?? []
    seen.push(barHeightOf(bar))
    found.set(id, seen)
  }
  return found
}

const quietThenCrowded: ScheduleResponse = {
  range: { from: '2026-01-01T00:00:00Z', to: '2026-04-01T00:00:00Z' },
  rows: [
    {
      event_id: 'jan',
      title: 'January Alone',
      kind: 'HACKATHON',
      state: 'ACTIVE',
      start_at: '2026-01-12T00:00:00Z',
      end_at: '2026-01-15T00:00:00Z',
      effective_format: 'ONLINE',
      stages: [],
    },
    ...Array.from({ length: 6 }, (_, index) => ({
      event_id: `feb${index}`,
      title: `February ${index}`,
      kind: 'HACKATHON' as const,
      state: 'ACTIVE' as const,
      start_at: '2026-02-09T00:00:00Z',
      end_at: '2026-02-13T00:00:00Z',
      effective_format: 'ONLINE' as const,
      stages: [],
    })),
  ],
}

describe('one thickness holds across every month on screen', () => {
  it('never draws a quiet month thicker than the crowded month beside it', () => {
    const { container } = renderMonth(quietThenCrowded, 3)

    const perMonth = [...container.querySelectorAll('[data-schedule-month]')]
      .map((month) => ({
        key: month.getAttribute('data-schedule-month'),
        heights: [...month.querySelectorAll('[data-schedule-item]')].map((bar) =>
          barHeightOf(bar as HTMLElement),
        ),
      }))
      .filter((month) => month.heights.length > 0)

    expect(perMonth.length, 'the view must draw bars in more than one month').toBeGreaterThan(1)

    const all = perMonth.flatMap((month) => month.heights)
    expect(
      new Set(all).size,
      `every month on screen must agree on one thickness, saw ${perMonth
        .map((month) => `${month.key}: ${month.heights.join('/')}`)
        .join('; ')}`,
    ).toBe(1)
  })

  it('thins the whole view down to what the busiest month can hold', () => {
    const { container } = renderMonth(quietThenCrowded, 3)

    const lanes = 6
    const shape = WRAPPED_SHAPE.month
    const room = wrappedBarHeight(shape.minCell, shape.barHeight, lanes, shape.maxBar)
    const drawn = bars(container).map((bar) => barHeightOf(bar))

    expect(drawn.length, 'the view must draw bars').toBeGreaterThan(0)
    for (const height of drawn) {
      expect(height, `a bar must fit the busiest month, which holds ${lanes} lanes`).toBe(
        `${room}px`,
      )
    }
  })
})

describe('one event keeps one thickness across the whole month', () => {
  it('draws the spanning event at the same height in its quiet week as in the crowded one', () => {
    const { container } = renderMonth(spanningAndCrowded)

    const heights = heightsById(container)
    const marathon = [...heights.entries()].find(([id]) => id.includes('long'))

    expect(marathon, 'the spanning event must be drawn').toBeDefined()
    const seen = marathon?.[1] ?? []
    expect(seen.length, 'the event must cross more than one week').toBeGreaterThan(1)
    expect(new Set(seen).size, `one event must keep one thickness, saw ${seen.join(', ')}`).toBe(1)
  })

  it('gives every bar of the month the same height, crowded week or not', () => {
    const { container } = renderMonth(spanningAndCrowded)

    const all = bars(container).map((bar) => barHeightOf(bar))
    expect(all.length, 'the month must draw bars').toBeGreaterThan(1)
    expect(new Set(all).size, `the month must settle on one thickness, saw ${all.join(', ')}`).toBe(
      1,
    )
  })
})
