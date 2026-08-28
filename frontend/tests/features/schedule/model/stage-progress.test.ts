import { describe, expect, it } from 'vitest'
import { stageProgress } from '@/features/schedule/model/stage-progress'
import type { Place, ScheduleItem } from '@/shared/api/types.gen'

const place: Place = { format: 'ONLINE', inherited: true }

function stage(id: string, start: string, end: string): ScheduleItem {
  return { id, name: id, type: 'PARTICIPATION', start_at: start, end_at: end, place }
}

const ONE = stage('one', '2026-01-01T00:00:00Z', '2026-01-10T00:00:00Z')
const TWO = stage('two', '2026-01-11T00:00:00Z', '2026-01-20T00:00:00Z')
const THREE = stage('three', '2026-01-21T00:00:00Z', '2026-01-30T00:00:00Z')
const FOUR = stage('four', '2026-02-01T00:00:00Z', '2026-02-10T00:00:00Z')

const STAGES = [ONE, TWO, THREE, FOUR]

describe('stageProgress', () => {
  it('returns nothing for an empty list', () => {
    expect(stageProgress([], new Date())).toEqual({ steps: [], currentIndex: -1, total: 0 })
  })

  it('marks the running stage as current and reports its ordinal', () => {
    const progress = stageProgress(STAGES, new Date('2026-01-15T00:00:00Z'))
    expect(progress.total).toBe(4)
    expect(progress.currentIndex).toBe(1)
    expect(progress.steps.map((step) => step.state)).toEqual([
      'past',
      'current',
      'future',
      'future',
    ])
  })

  it('points at the next stage while between two stages', () => {
    const progress = stageProgress(STAGES, new Date('2026-01-31T00:00:00Z'))
    expect(progress.currentIndex).toBe(3)
    expect(progress.steps[3]?.state).toBe('current')
  })

  it('points at the first stage before anything starts', () => {
    expect(stageProgress(STAGES, new Date('2025-12-01T00:00:00Z')).currentIndex).toBe(0)
  })

  it('points at the last stage after everything ends', () => {
    expect(stageProgress(STAGES, new Date('2027-01-01T00:00:00Z')).currentIndex).toBe(3)
  })

  it('orders unsorted input by start date', () => {
    const shuffled = [THREE, ONE, FOUR, TWO]
    expect(
      stageProgress(shuffled, new Date('2026-01-15T00:00:00Z')).steps.map((s) => s.id),
    ).toEqual(['one', 'two', 'three', 'four'])
  })

  it('does not mutate the input array', () => {
    const input = [THREE, ONE]
    const order = input.map((item) => item.id)
    stageProgress(input, new Date('2026-01-15T00:00:00Z'))
    expect(input.map((item) => item.id)).toEqual(order)
  })

  it('is computed from the clock, not stored on the stage', () => {
    const early = stageProgress(STAGES, new Date('2026-01-05T00:00:00Z')).currentIndex
    const late = stageProgress(STAGES, new Date('2026-02-05T00:00:00Z')).currentIndex
    expect(early).toBe(0)
    expect(late).toBe(3)
  })
})
