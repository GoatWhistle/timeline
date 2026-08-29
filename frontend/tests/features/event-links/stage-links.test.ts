import { describe, expect, it } from 'vitest'
import type { StageScopedLink } from '@/features/event-links/ui/stage-links/stage-links'
import { stageLinksOf } from '@/features/event-links/ui/stage-links/stage-links'

function link(id: string, kind: StageScopedLink['kind'], stageId?: string): StageScopedLink {
  return stageId ? { id, kind, stage_id: stageId } : { id, kind }
}

describe('stage scoped links', () => {
  const submission = link('a', 'SUBMISSION', 's1')
  const judging = link('b', 'JUDGING', 's2')
  const eventWide = link('c', 'RULES')
  const all = [submission, judging, eventWide]

  it('surfaces only the links of the stage in question', () => {
    expect(stageLinksOf(all, 's1')).toEqual([submission])
    expect(stageLinksOf(all, 's2')).toEqual([judging])
  })

  it('never surfaces an event wide link on a stage', () => {
    for (const stageId of ['s1', 's2', 's3']) {
      expect(stageLinksOf(all, stageId)).not.toContain(eventWide)
    }
  })

  it('returns nothing for a stage without links', () => {
    expect(stageLinksOf(all, 's3')).toEqual([])
  })
})
