import { describe, expect, it } from 'vitest'
import { emptyReason, rowsInPeriod } from '@/features/schedule/model/empty-reason'
import type { ScheduleResponse } from '@/shared/api/types.gen'

function response(rows: ScheduleResponse['rows']): ScheduleResponse {
  return { range: { from: '', to: '' }, rows }
}

function row(id: string, start: Date, end: Date): ScheduleResponse['rows'][number] {
  return {
    event_id: id,
    title: id,
    kind: 'HACKATHON',
    state: 'ACTIVE',
    start_at: start.toISOString(),
    end_at: end.toISOString(),
    effective_format: 'ONLINE',
    stages: [],
  }
}

describe('an empty period is told apart from an empty account', () => {
  it('counts a row whose event merely overlaps the period, not only one contained by it', () => {
    const data = response([row('e1', new Date(2026, 0, 20), new Date(2026, 1, 10))])

    expect(rowsInPeriod(data, new Date(2026, 1, 1), new Date(2026, 1, 28))).toBe(1)
  })

  it('leaves out a row that ends before the period and one that starts after it', () => {
    const data = response([
      row('before', new Date(2026, 0, 1), new Date(2026, 0, 5)),
      row('after', new Date(2026, 3, 1), new Date(2026, 3, 5)),
    ])

    expect(rowsInPeriod(data, new Date(2026, 1, 1), new Date(2026, 1, 28))).toBe(0)
  })

  it('says nothing at all while the period still has something to show', () => {
    expect(
      emptyReason({ totalRows: 3, periodRows: 1, scale: 'month', invitationShown: false }),
    ).toBe('none')
  })

  it('offers the catalog on the first empty schedule of the session', () => {
    expect(
      emptyReason({ totalRows: 0, periodRows: 0, scale: 'month', invitationShown: false }),
    ).toBe('invitation')
  })

  it('stops offering the catalog once the session has already been offered it', () => {
    expect(
      emptyReason({ totalRows: 0, periodRows: 0, scale: 'month', invitationShown: true }),
    ).toBe('period')
  })

  it('still names the account bare on a year, where empty means there is nothing anywhere', () => {
    expect(emptyReason({ totalRows: 0, periodRows: 0, scale: 'year', invitationShown: true })).toBe(
      'account',
    )
  })

  it('calls a bare period bare, never bare account, while other periods do hold events', () => {
    for (const scale of ['week', 'month', 'quarter', 'year'] as const) {
      expect(emptyReason({ totalRows: 4, periodRows: 0, scale, invitationShown: false })).toBe(
        'period',
      )
    }
  })
})
