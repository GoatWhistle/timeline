import { describe, expect, it } from 'vitest'
import { clusterDeadlines, findOverlaps, type Interval } from '@/features/burning/model/overlaps'

function event(id: string, startAt: string, endAt: string): Interval {
  return { id, title: id, startAt, endAt }
}

describe('overlapping events', () => {
  it('reports two events that share time', () => {
    const overlaps = findOverlaps([
      event('a', '2026-09-01T00:00:00Z', '2026-09-05T00:00:00Z'),
      event('b', '2026-09-04T00:00:00Z', '2026-09-08T00:00:00Z'),
    ])
    expect(overlaps).toHaveLength(1)
    expect(overlaps[0]?.first.id).toBe('a')
    expect(overlaps[0]?.second.id).toBe('b')
  })

  it('does not report events that merely touch at a distance', () => {
    const overlaps = findOverlaps([
      event('a', '2026-09-01T00:00:00Z', '2026-09-02T00:00:00Z'),
      event('b', '2026-09-05T00:00:00Z', '2026-09-06T00:00:00Z'),
    ])
    expect(overlaps).toHaveLength(0)
  })

  it('treats a shared boundary as an overlap', () => {
    const overlaps = findOverlaps([
      event('a', '2026-09-01T00:00:00Z', '2026-09-03T00:00:00Z'),
      event('b', '2026-09-03T00:00:00Z', '2026-09-04T00:00:00Z'),
    ])
    expect(overlaps).toHaveLength(1)
  })

  it('reports every pair when three events collide', () => {
    const overlaps = findOverlaps([
      event('a', '2026-09-01T00:00:00Z', '2026-09-10T00:00:00Z'),
      event('b', '2026-09-02T00:00:00Z', '2026-09-04T00:00:00Z'),
      event('c', '2026-09-03T00:00:00Z', '2026-09-05T00:00:00Z'),
    ])
    expect(overlaps).toHaveLength(3)
  })

  it('ignores an event whose dates do not parse', () => {
    const overlaps = findOverlaps([
      event('a', '2026-09-01T00:00:00Z', '2026-09-05T00:00:00Z'),
      event('broken', 'not a date', 'also not a date'),
    ])
    expect(overlaps).toHaveLength(0)
  })
})

describe('deadlines landing on one day', () => {
  it('clusters deadlines that share a day in the viewer zone', () => {
    const clusters = clusterDeadlines(
      [
        { id: 'a', deadlineAt: '2026-09-01T09:00:00Z' },
        { id: 'b', deadlineAt: '2026-09-01T20:00:00Z' },
        { id: 'c', deadlineAt: '2026-09-04T09:00:00Z' },
      ],
      'Europe/Moscow',
    )
    expect(clusters).toHaveLength(1)
    expect(clusters[0]?.ids).toEqual(['a', 'b'])
  })

  it('splits a cluster when the viewer zone moves a deadline past midnight', () => {
    const sameDayInMoscow = clusterDeadlines(
      [
        { id: 'a', deadlineAt: '2026-09-01T05:00:00Z' },
        { id: 'b', deadlineAt: '2026-09-01T20:00:00Z' },
      ],
      'Europe/Moscow',
    )
    expect(sameDayInMoscow).toHaveLength(1)

    const splitInTokyo = clusterDeadlines(
      [
        { id: 'a', deadlineAt: '2026-09-01T05:00:00Z' },
        { id: 'b', deadlineAt: '2026-09-01T20:00:00Z' },
      ],
      'Asia/Tokyo',
    )
    expect(splitInTokyo).toHaveLength(0)
  })

  it('ignores entries without a deadline', () => {
    const clusters = clusterDeadlines(
      [
        { id: 'a', deadlineAt: null },
        { id: 'b', deadlineAt: undefined },
        { id: 'c', deadlineAt: '2026-09-01T09:00:00Z' },
      ],
      'UTC',
    )
    expect(clusters).toHaveLength(0)
  })
})
