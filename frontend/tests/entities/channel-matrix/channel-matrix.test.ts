import { describe, expect, it } from 'vitest'
import {
  buildMatrix,
  buildRow,
  countByChannel,
  DELIVERY_CHANNELS,
  resolveChannel,
} from '@/entities/channel-matrix'
import type { NotificationRuleResponse } from '@/shared/api/types.gen'

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

describe('DELIVERY_CHANNELS', () => {
  it('holds only the two channels that actually deliver', () => {
    expect(DELIVERY_CHANNELS).toEqual(['TELEGRAM', 'EMAIL'])
  })

  it('does not offer an in-app channel', () => {
    expect(DELIVERY_CHANNELS).not.toContain('IN_APP')
  })
})

describe('resolveChannel', () => {
  it('takes the override when the rule sets one', () => {
    expect(resolveChannel('EMAIL', 'TELEGRAM')).toEqual({ channel: 'EMAIL', explicit: true })
  })

  it('falls back to the recipient preference', () => {
    expect(resolveChannel(undefined, 'EMAIL')).toEqual({ channel: 'EMAIL', explicit: false })
  })

  it('falls back to Telegram when nothing is set', () => {
    expect(resolveChannel(undefined, undefined)).toEqual({ channel: 'TELEGRAM', explicit: false })
  })
})

describe('buildRow', () => {
  it('marks an overridden channel as chosen and the other as off', () => {
    const row = buildRow(rule({ channel_override: 'EMAIL' }), 'TELEGRAM')
    expect(row.cells.EMAIL).toBe('chosen')
    expect(row.cells.TELEGRAM).toBe('off')
  })

  it('marks the preferred channel as a fallback rather than an explicit choice', () => {
    const row = buildRow(rule(), 'EMAIL')
    expect(row.cells.EMAIL).toBe('fallback')
    expect(row.cells.TELEGRAM).toBe('off')
  })

  it('switches every delivery channel off for a disabled rule', () => {
    const row = buildRow(rule({ enabled: false, channel_override: 'EMAIL' }), 'EMAIL')
    expect(row.cells.EMAIL).toBe('off')
    expect(row.cells.TELEGRAM).toBe('off')
  })

  it('selects exactly one delivery channel for an enabled rule', () => {
    const row = buildRow(rule(), 'EMAIL')
    const active = DELIVERY_CHANNELS.filter(
      (channel) => row.cells[channel] === 'chosen' || row.cells[channel] === 'fallback',
    )
    expect(active).toHaveLength(1)
  })

  it('keeps the in-app column a mirror, never a chosen channel', () => {
    expect(buildRow(rule({ channel_override: 'EMAIL' }), 'EMAIL').mirror).toBe('mirror')
    expect(buildRow(rule(), undefined).mirror).toBe('mirror')
  })

  it('mirrors even a disabled rule, because the mirror is not part of the choice', () => {
    expect(buildRow(rule({ enabled: false }), 'EMAIL').mirror).toBe('mirror')
  })
})

describe('buildMatrix', () => {
  it('orders rows by slot number', () => {
    const rows = buildMatrix(
      [rule({ id: 'b', slot_no: 2 }), rule({ id: 'a', slot_no: 1 })],
      'EMAIL',
    )
    expect(rows.map((row) => row.ruleId)).toEqual(['a', 'b'])
  })

  it('returns nothing for an event without rules', () => {
    expect(buildMatrix([], 'EMAIL')).toEqual([])
  })
})

describe('countByChannel', () => {
  it('counts only real delivery channels', () => {
    const rows = buildMatrix(
      [
        rule({ id: 'a', slot_no: 1, channel_override: 'EMAIL' }),
        rule({ id: 'b', slot_no: 2, channel_override: 'TELEGRAM' }),
        rule({ id: 'c', slot_no: 3, enabled: false, channel_override: 'EMAIL' }),
      ],
      'TELEGRAM',
    )
    expect(countByChannel(rows)).toEqual({ TELEGRAM: 1, EMAIL: 1 })
  })

  it('has no in-app total, because the mirror is not a delivery channel', () => {
    const totals = countByChannel(buildMatrix([rule()], 'EMAIL'))
    expect(Object.keys(totals).sort()).toEqual(['EMAIL', 'TELEGRAM'])
  })
})
