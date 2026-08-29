import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it } from 'vitest'
import { URGENCY_KEY, type Urgency } from '@/entities/deadline/urgency/urgency'
import { ScheduleGrid } from '@/features/schedule/ui/schedule-grid/schedule-grid'
import type { Place, ScheduleResponse } from '@/shared/api/types.gen'
import { i18n } from '@/shared/i18n/config'
import { NOW, range } from './schedule-fixtures'

const place: Place = { format: 'ONLINE', inherited: true }

const data: ScheduleResponse = {
  range: { from: '2026-01-01T00:00:00Z', to: '2026-04-01T00:00:00Z' },
  rows: [
    {
      event_id: 'e1',
      title: 'Grayscale Hackathon',
      state: 'ACTIVE',
      start_at: '2026-01-05T00:00:00Z',
      end_at: '2026-03-01T00:00:00Z',
      effective_format: 'ONLINE',
      registration_deadline: '2026-01-25T00:00:00Z',
      stages: [
        {
          id: 'reg',
          name: 'Registration',
          type: 'REGISTRATION',
          start_at: '2026-01-05T00:00:00Z',
          end_at: '2026-01-20T00:00:00Z',
          place,
        },
        {
          id: 'demo',
          name: 'Demo day',
          type: 'DEMO',
          start_at: '2026-02-01T00:00:00Z',
          end_at: '2026-02-10T00:00:00Z',
          place,
        },
        {
          id: 'guess',
          name: 'Unconfirmed span',
          type: 'OTHER',
          start_at: '2026-01-05T00:00:00Z',
          end_at: '2026-03-01T00:00:00Z',
          place,
        },
        {
          id: 'cp',
          name: 'Checkpoint',
          type: 'CHECKPOINT',
          start_at: '2026-02-15T00:00:00Z',
          end_at: '2026-02-15T00:30:00Z',
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
      ['overdue', '2026-01-10T00:00:00Z'],
      ['soon', '2026-01-18T00:00:00Z'],
      ['calm', '2026-03-01T00:00:00Z'],
    ] as const
  ).map(([id, deadline]) => ({
    event_id: id,
    title: `Deadline ${id}`,
    state: 'ACTIVE' as const,
    start_at: '2026-01-05T00:00:00Z',
    end_at: '2026-03-15T00:00:00Z',
    effective_format: 'ONLINE' as const,
    registration_deadline: deadline,
    stages: [],
  })),
}

function renderUrgencies() {
  const view = renderWithProviders(
    <ScheduleGrid data={urgencies} range={range} scale="quarter" now={NOW} />,
  )
  view.container.style.filter = 'grayscale(1)'
  return view
}

function renderGrayscale() {
  const view = renderWithProviders(
    <ScheduleGrid data={data} range={range} scale="quarter" now={NOW} />,
  )
  view.container.style.filter = 'grayscale(1)'
  return view
}

describe('schedule under grayscale', () => {
  it('applies the grayscale filter used by the check', () => {
    const { container } = renderGrayscale()
    expect(container.style.filter).toBe('grayscale(1)')
  })

  it('separates intervals from moments by shape, not colour', () => {
    const { container } = renderGrayscale()
    const bars = container.querySelectorAll('[data-schedule-item][data-unconfirmed]')
    const moments = container.querySelectorAll('[data-schedule-item][data-hollow]')
    expect(bars.length).toBeGreaterThan(0)
    expect(moments.length).toBeGreaterThan(0)
    for (const bar of bars) expect(bar).not.toHaveAttribute('data-hollow')
    for (const moment of moments) expect(moment).not.toHaveAttribute('data-unconfirmed')
  })

  it('separates a deadline from a checkpoint by fill, not colour', () => {
    const { container } = renderGrayscale()
    const hollow = [...container.querySelectorAll('[data-hollow]')].map(
      (mark) => (mark as HTMLElement).dataset.hollow,
    )
    expect(hollow).toContain('true')
    expect(hollow).toContain('false')
  })

  it('separates an unconfirmed stage from a confirmed one by outline, not colour', () => {
    const { container } = renderGrayscale()
    const flags = [...container.querySelectorAll('[data-unconfirmed]')].map(
      (bar) => (bar as HTMLElement).dataset.unconfirmed,
    )
    expect(flags).toContain('true')
    expect(flags).toContain('false')
  })

  it('names every stage in text as well as colour', () => {
    const { container } = renderGrayscale()
    for (const bar of container.querySelectorAll('[data-schedule-item][data-unconfirmed]')) {
      expect(bar.textContent?.trim().length ?? 0).toBeGreaterThan(0)
    }
  })

  it('carries a type name in every accessible label', () => {
    const { container } = renderGrayscale()
    for (const bar of container.querySelectorAll('[data-schedule-item][data-unconfirmed]')) {
      const label = bar.getAttribute('aria-label') ?? ''
      expect(label.split('.').filter((part) => part.trim()).length).toBeGreaterThanOrEqual(2)
    }
  })

  it('marks the three closest stage colours with a pattern as well', () => {
    const { container } = renderGrayscale()
    const patterned = [...container.querySelectorAll('[data-patterned="true"]')]
    expect(patterned.length).toBeGreaterThan(0)
  })

  it('leaves exactly one moment highlighted, distinguishable without colour', () => {
    const { container } = renderGrayscale()
    expect(container.querySelectorAll('[data-highlighted="true"]')).toHaveLength(1)
  })

  it('separates deadline urgency levels by a channel other than colour', () => {
    const { container } = renderUrgencies()
    const marks = [...container.querySelectorAll('[data-schedule-item][data-urgency]')]
    const levels = marks.map((mark) => (mark as HTMLElement).dataset.urgency)
    expect(new Set(levels).size).toBeGreaterThan(1)
  })

  it('names the urgency of every deadline in its accessible label', () => {
    const { container } = renderUrgencies()
    const marks = [...container.querySelectorAll('[data-schedule-item][data-urgency]')]
    expect(marks.length).toBeGreaterThan(0)
    for (const mark of marks) {
      const level = (mark as HTMLElement).dataset.urgency as Urgency
      const word = i18n.t(URGENCY_KEY[level])
      expect(mark.getAttribute('aria-label') ?? '').toContain(word)
    }
  })
})
