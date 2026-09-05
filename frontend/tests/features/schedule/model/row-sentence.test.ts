import { describe, expect, it } from 'vitest'
import { buildRowItems, type RowItem } from '@/features/schedule/model/row-items'
import {
  itemSentence,
  rowSentence,
  type SentenceContext,
} from '@/features/schedule/model/row-sentence'
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
    title: 'Winter Hack',
    kind: 'HACKATHON',
    state: 'ACTIVE',
    start_at: '2026-01-01T00:00:00Z',
    end_at: '2026-02-01T00:00:00Z',
    effective_format: 'ONLINE',
    stages: [],
    ...overrides,
  }
}

const ctx: SentenceContext = {
  t: (key, values) =>
    values && Object.keys(values).length > 0
      ? `${key}(${Object.entries(values)
          .map(([k, v]) => `${k}=${String(v)}`)
          .join('|')})`
      : key,
  formatDate: (iso) => iso.slice(0, 10),
  formatRemaining: (iso) => `left-until-${iso.slice(0, 10)}`,
}

describe('the deadline sentence honours what the participant reported', () => {
  const past = { registration_deadline: '2026-01-05T00:00:00Z' }
  const now = new Date('2026-01-20T00:00:00Z')

  it('calls a passed deadline overdue while the mark is still missing', () => {
    const sentence = rowSentence(row({ ...past }), [], { ...ctx, now })
    expect(sentence).toContain('event:urgency.overdue')
  })

  it('never nags about a deadline the participant already marked done', () => {
    const r = row({ ...past, registration_status: { id: 'r1', status: 'DONE', todo_cycle: 1 } })
    const sentence = rowSentence(r, [], { ...ctx, now })
    expect(sentence).toContain('event:urgency.done')
    expect(sentence).not.toContain('event:urgency.overdue')
  })

  it('never nags about a registration that is not required', () => {
    const r = row({
      ...past,
      registration_status: { id: 'r2', status: 'NOT_REQUIRED', todo_cycle: 1 },
    })
    const sentence = rowSentence(r, [], { ...ctx, now })
    expect(sentence).toContain('event:urgency.notRequired')
    expect(sentence).not.toContain('event:urgency.overdue')
  })
})

describe('rowSentence', () => {
  it('opens with the event title and its state', () => {
    const sentence = rowSentence(row(), [], ctx)
    expect(sentence.startsWith('Winter Hack. ')).toBe(true)
    expect(sentence).toContain('event:state.ACTIVE')
  })

  it('says nothing about stages when the row has none', () => {
    expect(rowSentence(row(), [], ctx)).not.toContain('schedule.sentenceStages')
  })

  it('counts the bars and lists each with its own dates', () => {
    const r = row({
      stages: [
        stage({ id: 'a', name: 'Build', start_at: '2026-01-05T00:00:00Z' }),
        stage({
          id: 'b',
          name: 'Judge',
          start_at: '2026-01-21T00:00:00Z',
          end_at: '2026-01-28T00:00:00Z',
        }),
      ],
    })
    const sentence = rowSentence(r, buildRowItems(r), ctx)
    expect(sentence).toContain('count=2')
    expect(sentence).toContain('Build')
    expect(sentence).toContain('Judge')
    expect(sentence).toContain('2026-01-05')
  })

  it('counts only bars, leaving checkpoints out of the stage tally', () => {
    const r = row({
      stages: [
        stage({ id: 'a', name: 'Build' }),
        stage({
          id: 'c',
          name: 'Demo day',
          type: 'CHECKPOINT',
          start_at: '2026-01-15T00:00:00Z',
          end_at: '2026-01-15T00:00:00Z',
        }),
      ],
    })
    const sentence = rowSentence(r, buildRowItems(r), ctx)
    expect(sentence).toContain('count=1')
    expect(sentence).toContain('schedule.sentenceCheckpoint')
    expect(sentence).toContain('Demo day')
  })

  it('names every checkpoint, not only the first', () => {
    const r = row({
      stages: [
        stage({
          id: 'c1',
          name: 'First gate',
          type: 'CHECKPOINT',
          start_at: '2026-01-12T00:00:00Z',
          end_at: '2026-01-12T00:00:00Z',
        }),
        stage({
          id: 'c2',
          name: 'Second gate',
          type: 'CHECKPOINT',
          start_at: '2026-01-18T00:00:00Z',
          end_at: '2026-01-18T00:00:00Z',
        }),
      ],
    })
    const sentence = rowSentence(r, buildRowItems(r), ctx)
    expect(sentence).toContain('First gate')
    expect(sentence).toContain('Second gate')
  })

  it('states the registration deadline with the time left when the row carries one', () => {
    const r = row({ registration_deadline: '2026-01-25T00:00:00Z' })
    const sentence = rowSentence(r, buildRowItems(r), ctx)
    expect(sentence).toContain('schedule.sentenceDeadline')
    expect(sentence).toContain('left-until-2026-01-25')
  })

  it('omits the deadline clause when the row has no registration deadline', () => {
    expect(rowSentence(row(), [], ctx)).not.toContain('schedule.sentenceDeadline')
  })
})

describe('itemSentence', () => {
  it('describes a bar with its stage name, type and both dates', () => {
    const r = row({ stages: [stage({ id: 'a', name: 'Build', type: 'SUBMISSION' })] })
    const bar = buildRowItems(r).find((item) => item.kind === 'bar') as RowItem
    const sentence = itemSentence(bar, ctx)
    expect(sentence).toContain('schedule.sentenceBar')
    expect(sentence).toContain('Build')
    expect(sentence).toContain('event:stageType.SUBMISSION')
    expect(sentence).toContain('2026-01-10')
    expect(sentence).toContain('2026-01-20')
  })

  it('describes a deadline moment with the time left rather than a name', () => {
    const r = row({ registration_deadline: '2026-01-25T00:00:00Z' })
    const deadline = buildRowItems(r).find(
      (item) => item.kind === 'moment' && item.moment === 'deadline',
    ) as RowItem
    const sentence = itemSentence(deadline, ctx)
    expect(sentence).toContain('schedule.sentenceDeadline')
    expect(sentence).toContain('left-until-2026-01-25')
  })

  it('describes a checkpoint moment with its name and date', () => {
    const r = row({
      stages: [
        stage({
          id: 'c',
          name: 'Demo day',
          type: 'CHECKPOINT',
          start_at: '2026-01-15T00:00:00Z',
          end_at: '2026-01-15T00:00:00Z',
        }),
      ],
    })
    const checkpoint = buildRowItems(r).find(
      (item) => item.kind === 'moment' && item.moment === 'checkpoint',
    ) as RowItem
    const sentence = itemSentence(checkpoint, ctx)
    expect(sentence).toContain('schedule.sentenceCheckpoint')
    expect(sentence).toContain('Demo day')
    expect(sentence).toContain('2026-01-15')
  })
})
