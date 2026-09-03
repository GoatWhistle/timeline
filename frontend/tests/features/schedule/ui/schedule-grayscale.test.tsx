import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it } from 'vitest'
import { URGENCY_KEY, type Urgency } from '@/entities/deadline/urgency/urgency'
import { ScheduleGrid } from '@/features/schedule/ui/schedule-grid/schedule-grid'
import type { Place, ScheduleResponse, StageType } from '@/shared/api/types.gen'
import { i18n } from '@/shared/i18n/config'
import { gridProps, NOW } from './schedule-fixtures'

const place: Place = { format: 'ONLINE', inherited: true }

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
    start_at: '2026-01-05T00:00:00Z',
    end_at: '2026-01-09T00:00:00Z',
    effective_format: 'ONLINE',
    stages: [
      {
        id: `${id}-s`,
        name: `Stage ${id}`,
        type,
        start_at: '2026-01-05T00:00:00Z',
        end_at: '2026-01-08T00:00:00Z',
        place,
      },
    ],
    ...overrides,
  }
}

const data: ScheduleResponse = {
  range: { from: '2026-01-01T00:00:00Z', to: '2026-04-01T00:00:00Z' },
  rows: [
    eventWith('reg', 'REGISTRATION', { registration_deadline: '2026-01-06T00:00:00Z' }),
    eventWith('demo', 'DEMO', {
      start_at: '2026-01-12T00:00:00Z',
      end_at: '2026-01-16T00:00:00Z',
      stages: [
        {
          id: 'demo-s',
          name: 'Demo day',
          type: 'DEMO',
          start_at: '2026-01-12T00:00:00Z',
          end_at: '2026-01-15T00:00:00Z',
          place,
        },
      ],
    }),
    {
      event_id: 'guess',
      title: 'Unconfirmed span',
      kind: 'HACKATHON',
      state: 'ACTIVE',
      start_at: '2026-01-19T00:00:00Z',
      end_at: '2026-01-23T00:00:00Z',
      effective_format: 'ONLINE',
      stages: [],
    },
    {
      event_id: 'cp',
      title: 'Checkpoint carrier',
      kind: 'HACKATHON',
      state: 'ACTIVE',
      start_at: '2026-02-02T00:00:00Z',
      end_at: '2026-02-06T00:00:00Z',
      effective_format: 'ONLINE',
      stages: [
        {
          id: 'cp-part',
          name: 'Participation',
          type: 'PARTICIPATION',
          start_at: '2026-02-02T00:00:00Z',
          end_at: '2026-02-05T00:00:00Z',
          place,
        },
        {
          id: 'cp-mark',
          name: 'Checkpoint',
          type: 'CHECKPOINT',
          start_at: '2026-02-04T00:00:00Z',
          end_at: '2026-02-04T00:30:00Z',
          place,
        },
      ],
    },
  ],
}

const urgencies: ScheduleResponse = {
  range: { from: '2026-01-01T00:00:00Z', to: '2026-04-01T00:00:00Z' },
  rows: (
    [
      ['overdue', '2026-01-10T00:00:00Z', '2026-01-05T00:00:00Z'],
      ['soon', '2026-01-18T00:00:00Z', '2026-01-16T00:00:00Z'],
      ['calm', '2026-03-01T00:00:00Z', '2026-02-25T00:00:00Z'],
    ] as const
  ).map(([id, deadline, start]) => ({
    event_id: id,
    title: `Deadline ${id}`,
    kind: 'HACKATHON' as const,
    state: 'ACTIVE' as const,
    start_at: start,
    end_at: deadline,
    effective_format: 'ONLINE' as const,
    registration_deadline: deadline,
    stages: [],
  })),
}

function renderGrayscale(source: ScheduleResponse = data) {
  const view = renderWithProviders(
    <ScheduleGrid data={source} {...gridProps} scale="quarter" dayWidth={15} now={NOW} />,
  )
  view.container.style.filter = 'grayscale(1)'
  return view
}

function barsOf(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll('[data-schedule-item]')].filter(
    (element): element is HTMLElement => element instanceof HTMLElement,
  )
}

describe('schedule under grayscale', () => {
  it('applies the grayscale filter used by the check', () => {
    const { container } = renderGrayscale()
    expect(container.style.filter).toBe('grayscale(1)')
  })

  it('separates bars from moment marks by shape, not colour', () => {
    const { container } = renderGrayscale()
    const bars = barsOf(container)
    const marks = container.querySelectorAll('[data-schedule-mark]')

    expect(bars.length).toBeGreaterThan(0)
    expect(marks.length).toBeGreaterThan(0)
    for (const bar of bars) expect(bar).not.toHaveAttribute('data-hollow')
    for (const mark of marks) expect(mark).toHaveAttribute('data-hollow')
  })

  it('separates a deadline from a checkpoint by fill, not colour', () => {
    const { container } = renderGrayscale()
    const hollow = [...container.querySelectorAll('[data-schedule-mark]')].map(
      (mark) => (mark as HTMLElement).dataset.hollow,
    )
    expect(hollow).toContain('true')
    expect(hollow).toContain('false')
  })

  it('separates an unconfirmed event from a confirmed one by outline, not colour', () => {
    const { container } = renderGrayscale()
    const flags = barsOf(container).map((bar) => bar.dataset.unconfirmed)
    expect(flags).toContain('true')
    expect(flags).toContain('false')
  })

  it('names every event in text as well as colour', () => {
    const { container } = renderGrayscale()
    for (const bar of barsOf(container)) {
      expect(bar.textContent?.trim().length ?? 0).toBeGreaterThan(0)
    }
  })

  it('carries a full sentence in every accessible label', () => {
    const { container } = renderGrayscale()
    for (const bar of barsOf(container)) {
      const label = bar.getAttribute('aria-label') ?? ''
      expect(label.split('.').filter((part) => part.trim()).length).toBeGreaterThanOrEqual(2)
    }
  })

  it('pairs every bar with a stage-type icon, not colour alone', () => {
    const { container } = renderGrayscale()
    for (const bar of barsOf(container)) {
      expect(bar.querySelector('svg')).toBeInTheDocument()
    }
  })

  it('marks the closest stage colours with a pattern as well', () => {
    const { container } = renderGrayscale()
    expect(container.querySelectorAll('[data-patterned="true"]').length).toBeGreaterThan(0)
  })

  it('leaves exactly one moment highlighted, distinguishable without colour', () => {
    const { container } = renderGrayscale()
    expect(container.querySelectorAll('[data-highlighted="true"]')).toHaveLength(1)
  })

  it('separates deadline urgency levels by a channel other than colour', () => {
    const { container } = renderGrayscale(urgencies)
    const levels = [...container.querySelectorAll('[data-schedule-mark][data-urgency]')].map(
      (mark) => (mark as HTMLElement).dataset.urgency,
    )
    expect(new Set(levels).size).toBeGreaterThan(1)
  })

  it('names the urgency of every deadline in the accessible sentence', () => {
    const { container } = renderGrayscale(urgencies)
    const bars = barsOf(container)
    expect(bars.length).toBeGreaterThan(0)

    for (const bar of bars) {
      const mark = bar.querySelector('[data-schedule-mark][data-urgency]')
      if (!mark) continue
      const level = (mark as HTMLElement).dataset.urgency as Urgency
      expect(bar.getAttribute('aria-label') ?? '').toContain(i18n.t(URGENCY_KEY[level]))
    }
  })

  it('marks a clipped edge with a shape, not a silent cut', () => {
    const { container } = renderGrayscale()
    const clipped = barsOf(container).filter(
      (bar) => bar.dataset.clippedStart === 'true' || bar.dataset.clippedEnd === 'true',
    )
    for (const bar of clipped) {
      expect(bar.dataset.clippedStart === 'true' || bar.dataset.clippedEnd === 'true').toBe(true)
    }
  })
})
