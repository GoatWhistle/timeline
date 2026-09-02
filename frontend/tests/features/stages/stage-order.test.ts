import { describe, expect, it } from 'vitest'
import { canMove, moveStage, sortedStages } from '@/features/stages/stage-order'
import type { StageResponse } from '@/shared/api/types.gen'

function stage(id: string, sortOrder: number, startAt = '2026-05-01T00:00:00Z'): StageResponse {
  return {
    id,
    event_id: 'ev_1',
    name: id,
    type: 'PARTICIPATION',
    start_at: startAt,
    end_at: '2026-05-02T00:00:00Z',
    sort_order: sortOrder,
    place: { format: 'ONLINE', inherited: true },
    created_at: startAt,
    updated_at: startAt,
  } as StageResponse
}

const STAGES = [stage('c', 2), stage('a', 0), stage('b', 1)]

describe('stages are listed in their declared order', () => {
  it('sorts by sort_order', () => {
    expect(sortedStages(STAGES).map((s) => s.id)).toEqual(['a', 'b', 'c'])
  })

  it('breaks a tie by the start of the stage, not by chance', () => {
    const tied = [
      stage('late', 0, '2026-05-05T00:00:00Z'),
      stage('early', 0, '2026-05-01T00:00:00Z'),
    ]
    expect(sortedStages(tied).map((s) => s.id)).toEqual(['early', 'late'])
  })

  it('leaves the given array untouched', () => {
    const original = [...STAGES]
    sortedStages(STAGES)
    expect(STAGES).toEqual(original)
  })
})

describe('moving a stage rewrites only the positions that changed', () => {
  it('swaps a stage with the one above it', () => {
    const changes = moveStage(STAGES, 'b', -1)
    expect(changes).toEqual([
      { id: 'b', sort_order: 0 },
      { id: 'a', sort_order: 1 },
    ])
  })

  it('swaps a stage with the one below it', () => {
    const changes = moveStage(STAGES, 'b', 1)
    expect(changes).toEqual([
      { id: 'c', sort_order: 1 },
      { id: 'b', sort_order: 2 },
    ])
  })

  it('refuses to move the first stage up or the last one down', () => {
    expect(moveStage(STAGES, 'a', -1)).toEqual([])
    expect(moveStage(STAGES, 'c', 1)).toEqual([])
  })

  it('refuses to move a stage that is not there', () => {
    expect(moveStage(STAGES, 'missing', 1)).toEqual([])
  })

  it('reports whether a move is possible at all', () => {
    expect(canMove(STAGES, 'a', -1)).toBe(false)
    expect(canMove(STAGES, 'a', 1)).toBe(true)
    expect(canMove(STAGES, 'c', 1)).toBe(false)
    expect(canMove(STAGES, 'c', -1)).toBe(true)
    expect(canMove(STAGES, 'missing', 1)).toBe(false)
  })

  it('closes a gap in the numbering while moving', () => {
    const gapped = [stage('a', 0), stage('b', 5), stage('c', 9)]
    expect(moveStage(gapped, 'c', -1)).toEqual([
      { id: 'c', sort_order: 1 },
      { id: 'b', sort_order: 2 },
    ])
  })
})
