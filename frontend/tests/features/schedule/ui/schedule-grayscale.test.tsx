import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it } from 'vitest'
import { WRAPPED_SHAPE } from '@/features/schedule/model/schedule-scale'
import { WeekGrid } from '@/features/schedule/ui/week-grid/week-grid'
import { WrappedGrid } from '@/features/schedule/ui/wrapped-grid/wrapped-grid'
import type { Place, ScheduleResponse, StageType } from '@/shared/api/types.gen'
import { NOW, WEEK_FROM, WEEK_TO, weekLocale } from './schedule-fixtures'

const place: Place = { format: 'ONLINE', inherited: true }
const MONTH_FROM = new Date('2026-01-01T00:00:00')

function eventWith(
  id: string,
  type: StageType,
  overrides: Partial<ScheduleResponse['rows'][number]> = {},
): ScheduleResponse['rows'][number] {
  return {
    event_id: id,
    title: `Event ${id}`,
    kind: 'HACKATHON',
    state: 'ACTIVE',
    start_at: '2026-01-13T09:00:00Z',
    end_at: '2026-01-15T18:00:00Z',
    effective_format: 'ONLINE',
    stages: [
      {
        id: `${id}-s`,
        name: `Stage ${id}`,
        type,
        start_at: '2026-01-13T09:00:00Z',
        end_at: '2026-01-14T18:00:00Z',
        place,
      },
    ],
    ...overrides,
  }
}

const data: ScheduleResponse = {
  range: { from: '2026-01-01T00:00:00Z', to: '2026-04-01T00:00:00Z' },
  rows: [
    eventWith('reg', 'REGISTRATION', { registration_deadline: '2026-01-14T00:00:00Z' }),
    eventWith('meet', 'DEMO', { kind: 'MEETUP', title: 'Meetup evening' }),
    {
      event_id: 'guess',
      title: 'Unconfirmed span',
      kind: 'HACKATHON',
      state: 'ACTIVE',
      start_at: '2026-01-14T09:00:00Z',
      end_at: '2026-01-16T18:00:00Z',
      effective_format: 'ONLINE',
      stages: [],
    },
  ],
}

function renderGrayscaleMonth(
  source: ScheduleResponse = data,
  props: Record<string, unknown> = {},
) {
  const shape = WRAPPED_SHAPE.month
  const view = renderWithProviders(
    <WrappedGrid
      data={source}
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
  view.container.style.filter = 'grayscale(1)'
  return view
}

function renderGrayscaleWeek(source: ScheduleResponse = data) {
  const view = renderWithProviders(
    <WeekGrid data={source} from={WEEK_FROM} to={WEEK_TO} locale={weekLocale} now={NOW} />,
  )
  view.container.style.filter = 'grayscale(1)'
  return view
}

function barsOf(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll('[data-schedule-item]')].filter(
    (element): element is HTMLElement => element instanceof HTMLElement,
  )
}

describe('the schedule under grayscale', () => {
  it('applies the grayscale filter used by the check', () => {
    const { container } = renderGrayscaleMonth()
    expect(container.style.filter).toBe('grayscale(1)')
  })

  it('names every event in text as well as colour', () => {
    const { container } = renderGrayscaleWeek()
    for (const bar of barsOf(container)) {
      expect(bar.textContent?.trim().length ?? 0).toBeGreaterThan(0)
    }
  })

  it('carries a full sentence in every accessible label', () => {
    const { container } = renderGrayscaleMonth()
    const found = barsOf(container)

    expect(found.length).toBeGreaterThan(0)
    for (const bar of found) {
      const label = bar.getAttribute('aria-label') ?? ''
      expect(label.split('.').filter((part) => part.trim()).length).toBeGreaterThanOrEqual(2)
    }
  })

  it('pairs every bar with a kind icon, not colour alone', () => {
    const { container } = renderGrayscaleWeek()
    for (const bar of barsOf(container)) {
      expect(bar.querySelector('svg')).toBeInTheDocument()
    }
  })

  it('separates a hackathon from a meetup by an attribute, not by tint', () => {
    const { container } = renderGrayscaleMonth()
    const kinds = barsOf(container).map((bar) => bar.dataset.kind)

    expect(kinds).toContain('HACKATHON')
    expect(kinds).toContain('MEETUP')
  })

  it('marks a clipped edge with a flag, not a silent cut', () => {
    const { container } = renderGrayscaleMonth()
    for (const bar of barsOf(container)) {
      expect(bar).toHaveAttribute('data-clipped-start')
      expect(bar).toHaveAttribute('data-clipped-end')
    }
  })

  it('marks the selection by an attribute and a word, not by colour alone', () => {
    const { container } = renderGrayscaleMonth(data, { selectedId: 'reg' })
    const selected = container.querySelector('[data-schedule-item="reg"]')

    expect(selected).toHaveAttribute('data-selected', 'true')
    expect(selected).toHaveAttribute('aria-current', 'true')
    expect(selected?.textContent).toMatch(/selected/i)
  })

  it('carries no hardcoded colour of its own on a bar', () => {
    const { container } = renderGrayscaleMonth()
    for (const bar of barsOf(container)) {
      const slot = bar.closest('[data-event-color]')
      expect(slot?.getAttribute('style') ?? '').not.toMatch(/#[0-9a-f]{3,8}|oklch\(|rgb\(/i)
    }
  })
})
