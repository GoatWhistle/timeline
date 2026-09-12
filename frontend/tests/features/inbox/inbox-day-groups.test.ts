import { describe, expect, it } from 'vitest'
import { dayLabelKind, groupByDay } from '@/features/inbox/inbox-day-groups'
import type { InboxItemResponse } from '@/shared/api/types.gen'

function item(id: string, createdAt: string): InboxItemResponse {
  return {
    id,
    kind: 'notification.primary',
    title: `Item ${id}`,
    body_md: 'body',
    actions: [],
    logical_key: `key-${id}`,
    created_at: createdAt,
  } as unknown as InboxItemResponse
}

describe('groupByDay', () => {
  it('groups consecutive items from the same day', () => {
    const groups = groupByDay(
      [
        item('a', '2026-02-10T09:00:00Z'),
        item('b', '2026-02-10T18:00:00Z'),
        item('c', '2026-02-09T09:00:00Z'),
      ],
      'UTC',
    )
    expect(groups).toHaveLength(2)
    expect(groups[0]?.items.map((i) => i.id)).toEqual(['a', 'b'])
    expect(groups[1]?.items.map((i) => i.id)).toEqual(['c'])
  })

  it('returns nothing for an empty list', () => {
    expect(groupByDay([], 'UTC')).toEqual([])
  })

  it('starts a new group when the same day recurs non-consecutively', () => {
    const groups = groupByDay(
      [
        item('a', '2026-02-10T09:00:00Z'),
        item('b', '2026-02-09T09:00:00Z'),
        item('c', '2026-02-10T18:00:00Z'),
      ],
      'UTC',
    )
    expect(groups).toHaveLength(3)
  })
})

describe('dayLabelKind', () => {
  const now = new Date('2026-02-10T12:00:00Z')
  const zone = 'UTC'

  it('labels the current day as today', () => {
    expect(dayLabelKind(new Date('2026-02-10T05:00:00Z'), now, zone)).toBe('today')
  })

  it('labels the previous day as yesterday', () => {
    expect(dayLabelKind(new Date('2026-02-09T23:00:00Z'), now, zone)).toBe('yesterday')
  })

  it('labels an older date this year as thisYear', () => {
    expect(dayLabelKind(new Date('2026-01-01T00:00:00Z'), now, zone)).toBe('thisYear')
  })

  it('labels a date from a previous year as other', () => {
    expect(dayLabelKind(new Date('2025-01-01T00:00:00Z'), now, zone)).toBe('other')
  })
})
