import { describe, expect, it } from 'vitest'
import { buildRow, type CellState } from '@/entities/channel-matrix'
import type { NotificationRuleResponse } from '@/shared/api/types.gen'

const STATES: CellState[] = ['chosen', 'fallback', 'off', 'mirror']

function rule(patch: Partial<NotificationRuleResponse> = {}): NotificationRuleResponse {
  return {
    id: 'r-1',
    slot_no: 1,
    offset_minutes: 1440,
    enabled: true,
    created_at: '2026-08-01T00:00:00Z',
    registration_id: 'reg-1',
    type: 'REGISTRATION_REMINDER',
    updated_at: '2026-08-01T00:00:00Z',
    ...patch,
  }
}

describe('matrix cell states', () => {
  it('names every state a cell can take', () => {
    const seen = new Set<CellState>()
    seen.add(buildRow(rule({ channel_override: 'EMAIL' }), 'EMAIL').cells.EMAIL)
    seen.add(buildRow(rule({ channel_override: 'EMAIL' }), 'EMAIL').cells.TELEGRAM)
    seen.add(buildRow(rule(), 'EMAIL').cells.EMAIL)
    seen.add(buildRow(rule(), 'EMAIL').mirror)
    expect([...seen].sort()).toEqual([...STATES].sort())
  })

  it('keeps the mirror distinct from the fallback state', () => {
    const row = buildRow(rule(), 'EMAIL')
    expect(row.mirror).not.toBe(row.cells.EMAIL)
  })
})
