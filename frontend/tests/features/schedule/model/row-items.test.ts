import { describe, expect, it } from 'vitest'
import {
  barsOf,
  buildRowItems,
  DEADLINE_ITEM_ID,
  isMomentStage,
  isUnconfirmed,
  momentsOf,
  timeOf,
} from '@/features/schedule/model/row-items'
import type { Place, ScheduleItem, ScheduleRow } from '@/shared/api/types.gen'

const place: Place = { format: 'ONLINE', inherited: true }

function stage(overrides: Partial<ScheduleItem>): ScheduleItem {
  return {
    id: 's',
    name: 'Stage',
    type: 'PARTICIPATION',
    start_at: '2026-01-10T00:00:00Z',
    end_at: '2026-01-20T00:00:00Z',
    place,
    ...overrides,
  }
}

function row(overrides: Partial<ScheduleRow> = {}): ScheduleRow {
  return {
    event_id: 'e1',
    title: 'Event',
    state: 'ACTIVE',
    start_at: '2026-01-01T00:00:00Z',
    end_at: '2026-02-01T00:00:00Z',
    effective_format: 'ONLINE',
    stages: [],
    ...overrides,
  }
}

describe('isMomentStage', () => {
  it('treats a checkpoint as a moment whatever its length', () => {
    expect(isMomentStage(stage({ type: 'CHECKPOINT' }))).toBe(true)
  })

  it('treats a stage shorter than an hour as a moment', () => {
    expect(
      isMomentStage(stage({ start_at: '2026-01-10T09:00:00Z', end_at: '2026-01-10T09:30:00Z' })),
    ).toBe(true)
  })

  it('treats a multi-day stage as an interval', () => {
    expect(isMomentStage(stage({}))).toBe(false)
  })
})

describe('isUnconfirmed', () => {
  it('marks a stage co-extensive with the whole event as unconfirmed', () => {
    const parent = row()
    expect(isUnconfirmed(stage({ start_at: parent.start_at, end_at: parent.end_at }), parent)).toBe(
      true,
    )
  })

  it('leaves a stage with its own dates confirmed', () => {
    expect(isUnconfirmed(stage({}), row())).toBe(false)
  })

  it('marks an unparsable stage as unconfirmed', () => {
    expect(isUnconfirmed(stage({ start_at: 'not a date' }), row())).toBe(true)
  })
})

describe('buildRowItems', () => {
  it('splits intervals from moments', () => {
    const items = buildRowItems(
      row({ stages: [stage({ id: 'a' }), stage({ id: 'b', type: 'CHECKPOINT' })] }),
    )
    expect(barsOf(items).map((item) => item.id)).toEqual(['a'])
    expect(momentsOf(items).map((item) => item.id)).toEqual(['b'])
  })

  it('adds the registration deadline as a moment', () => {
    const items = buildRowItems(row({ registration_deadline: '2026-01-15T00:00:00Z' }))
    expect(items).toHaveLength(1)
    expect(items[0]?.id).toBe(DEADLINE_ITEM_ID)
    expect(momentsOf(items)[0]?.moment).toBe('deadline')
  })

  it('omits the deadline when the row has none', () => {
    expect(buildRowItems(row())).toEqual([])
  })

  it('orders every item by time', () => {
    const items = buildRowItems(
      row({
        registration_deadline: '2026-01-15T00:00:00Z',
        stages: [
          stage({ id: 'late', start_at: '2026-01-20T00:00:00Z', end_at: '2026-01-25T00:00:00Z' }),
          stage({ id: 'early', start_at: '2026-01-02T00:00:00Z', end_at: '2026-01-05T00:00:00Z' }),
        ],
      }),
    )
    expect(items.map((item) => item.id)).toEqual(['early', DEADLINE_ITEM_ID, 'late'])
    const times = items.map(timeOf)
    expect([...times].sort((a, b) => a - b)).toEqual(times)
  })

  it('carries the unconfirmed flag onto the bar', () => {
    const parent = row({
      stages: [stage({ start_at: '2026-01-01T00:00:00Z', end_at: '2026-02-01T00:00:00Z' })],
    })
    expect(barsOf(buildRowItems(parent))[0]?.unconfirmed).toBe(true)
  })
})
