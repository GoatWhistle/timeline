import { describe, expect, it } from 'vitest'
import { nearestUpcomingId, nearestUpcomingMoment } from '@/features/schedule/model/nearest-moment'
import type { MomentItem, RowItem } from '@/features/schedule/model/row-items'

function moment(id: string, at: string, kind: MomentItem['moment'] = 'checkpoint'): RowItem {
  return { kind: 'moment', id, moment: kind, at, name: id }
}

const NOW = new Date('2026-01-15T00:00:00Z')

describe('nearestUpcomingMoment', () => {
  it('returns nothing when there are no moments', () => {
    expect(nearestUpcomingMoment([], NOW)).toBeUndefined()
  })

  it('picks exactly one moment, the soonest still ahead', () => {
    const items = [
      moment('past', '2026-01-01T00:00:00Z'),
      moment('next', '2026-01-20T00:00:00Z'),
      moment('later', '2026-02-01T00:00:00Z'),
    ]
    expect(nearestUpcomingId(items, NOW)).toBe('next')
  })

  it('ignores everything already past', () => {
    const items = [moment('a', '2026-01-01T00:00:00Z'), moment('b', '2026-01-10T00:00:00Z')]
    expect(nearestUpcomingMoment(items, NOW)).toBeUndefined()
  })

  it('counts a moment exactly now as upcoming', () => {
    expect(nearestUpcomingId([moment('now', NOW.toISOString())], NOW)).toBe('now')
  })

  it('considers deadlines alongside checkpoints', () => {
    const items = [
      moment('checkpoint', '2026-02-01T00:00:00Z'),
      moment('deadline', '2026-01-16T00:00:00Z', 'deadline'),
    ]
    expect(nearestUpcomingId(items, NOW)).toBe('deadline')
  })

  it('ignores bars entirely', () => {
    const bar: RowItem = {
      kind: 'bar',
      id: 'bar',
      startAt: '2026-01-16T00:00:00Z',
      endAt: '2026-01-30T00:00:00Z',
      unconfirmed: false,
      stage: {
        id: 'bar',
        name: 'Bar',
        type: 'PARTICIPATION',
        start_at: '2026-01-16T00:00:00Z',
        end_at: '2026-01-30T00:00:00Z',
        place: { format: 'ONLINE', inherited: true },
      },
    }
    expect(nearestUpcomingId([bar, moment('cp', '2026-02-01T00:00:00Z')], NOW)).toBe('cp')
  })

  it('skips a moment with an unparsable date', () => {
    const items = [moment('broken', 'not a date'), moment('good', '2026-01-20T00:00:00Z')]
    expect(nearestUpcomingId(items, NOW)).toBe('good')
  })
})
