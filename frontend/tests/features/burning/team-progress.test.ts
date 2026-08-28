import { describe, expect, it } from 'vitest'
import {
  progressRatio,
  type StatusCarrier,
  teamProgress,
} from '@/features/burning/model/team-progress'

function roster(...statuses: StatusCarrier['status'][]): StatusCarrier[] {
  return statuses.map((status) => ({ status }))
}

describe('teamProgress', () => {
  it('counts marked registrations against those still required', () => {
    const progress = teamProgress(roster('DONE', 'DONE', 'TODO', 'TODO', 'TODO'))
    expect(progress).toEqual({ done: 2, required: 5, waived: 0, pending: 3 })
  })

  it('takes a waived member out of the denominator instead of counting them as done', () => {
    const progress = teamProgress(roster('DONE', 'NOT_REQUIRED', 'TODO'))
    expect(progress.done).toBe(1)
    expect(progress.required).toBe(2)
    expect(progress.waived).toBe(1)
    expect(progress.pending).toBe(1)
  })

  it('reports an empty roster without dividing by zero', () => {
    expect(teamProgress([])).toEqual({ done: 0, required: 0, waived: 0, pending: 0 })
    expect(progressRatio(teamProgress([]))).toBe(1)
  })

  it('reports a fully waived roster as complete rather than as zero progress', () => {
    const progress = teamProgress(roster('NOT_REQUIRED', 'NOT_REQUIRED'))
    expect(progress.required).toBe(0)
    expect(progressRatio(progress)).toBe(1)
  })

  it('yields a ratio inside the unit interval for a partial roster', () => {
    const ratio = progressRatio(teamProgress(roster('DONE', 'TODO', 'TODO', 'TODO')))
    expect(ratio).toBeCloseTo(0.25)
  })

  it('carries counts only, never a member identity', () => {
    const progress = teamProgress(roster('DONE', 'TODO'))
    for (const value of Object.values(progress)) {
      expect(typeof value).toBe('number')
    }
    expect(Object.keys(progress).sort()).toEqual(['done', 'pending', 'required', 'waived'])
  })
})
