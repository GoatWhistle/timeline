import { describe, expect, it } from 'vitest'
import {
  classifyQueueRow,
  hasNoChannelLeft,
  overdueSeconds,
  splitOverdue,
  triedChannels,
} from '@/entities/ops'
import type { QueueEntryResponse } from '@/shared/api/types.gen'

function entry(patch: Partial<QueueEntryResponse> = {}): QueueEntryResponse {
  return {
    id: 'q-1',
    actual_channel: 'EMAIL',
    attempt_count: 4,
    created_at: '2026-08-28T09:00:00Z',
    failed_channels: [],
    last_error: 'permanent provider error',
    lease_expires_at: '2026-08-28T09:05:00Z',
    lease_overdue_seconds: 0,
    notification_type: 'REGISTRATION_REMINDER',
    requested_channel: 'EMAIL',
    scheduled_at: '2026-08-28T09:00:00Z',
    status: 'FAILED',
    updated_at: '2026-08-28T09:10:00Z',
    ...patch,
  }
}

describe('classifyQueueRow', () => {
  it('marks FAILED as a terminal failure', () => {
    expect(classifyQueueRow('FAILED').kind).toBe('failed')
  })

  it('marks UNDELIVERABLE separately from FAILED', () => {
    expect(classifyQueueRow('UNDELIVERABLE').kind).toBe('undeliverable')
  })

  it('treats PROCESSING as a stuck lease', () => {
    expect(classifyQueueRow('PROCESSING').kind).toBe('stuck')
  })

  it('falls back to other for anything else', () => {
    expect(classifyQueueRow('SENT').kind).toBe('other')
    expect(classifyQueueRow(undefined).kind).toBe('other')
  })

  it('gives every kind a reason key so colour is never the only signal', () => {
    for (const status of ['FAILED', 'UNDELIVERABLE', 'PROCESSING', 'SENT'] as const) {
      const shape = classifyQueueRow(status)
      expect(shape.labelKey).toMatch(/^ops:kind\./)
      expect(shape.reasonKey).toMatch(/^ops:reason\./)
    }
  })
})

describe('overdueSeconds', () => {
  it('returns the overdue value when the lease is late', () => {
    expect(overdueSeconds(entry({ lease_overdue_seconds: 93.4 }))).toBe(93.4)
  })

  it('returns null when the lease is not overdue', () => {
    expect(overdueSeconds(entry({ lease_overdue_seconds: 0 }))).toBeNull()
    expect(overdueSeconds(entry({ lease_overdue_seconds: -5 }))).toBeNull()
    expect(overdueSeconds(entry())).toBeNull()
  })
})

describe('triedChannels', () => {
  it('keeps the order the channels were tried in', () => {
    expect(triedChannels(entry({ failed_channels: ['TELEGRAM', 'EMAIL'] }))).toEqual([
      'TELEGRAM',
      'EMAIL',
    ])
  })

  it('drops repeated channels', () => {
    expect(triedChannels(entry({ failed_channels: ['EMAIL', 'EMAIL'] }))).toEqual(['EMAIL'])
  })

  it('returns an empty list when nothing was tried', () => {
    expect(triedChannels(entry())).toEqual([])
  })
})

describe('hasNoChannelLeft', () => {
  it('is true when an entry became undeliverable without trying a channel', () => {
    expect(hasNoChannelLeft(entry({ status: 'UNDELIVERABLE' }))).toBe(true)
  })

  it('is false when channels were tried and failed', () => {
    expect(hasNoChannelLeft(entry({ status: 'UNDELIVERABLE', failed_channels: ['EMAIL'] }))).toBe(
      false,
    )
  })

  it('is false for a plain failure', () => {
    expect(hasNoChannelLeft(entry({ status: 'FAILED' }))).toBe(false)
  })
})

describe('splitOverdue', () => {
  it('splits seconds into days, hours, minutes and seconds', () => {
    expect(splitOverdue(90061)).toEqual({ days: 1, hours: 1, minutes: 1, seconds: 1 })
  })

  it('keeps a sub-minute lease visible', () => {
    expect(splitOverdue(42)).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 42 })
  })

  it('clamps a negative value to zero', () => {
    expect(splitOverdue(-10)).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0 })
  })
})

describe('overdue wording', () => {
  it('never leaves a sub-minute lease without a unit', () => {
    const parts = splitOverdue(42)
    const chunks = [parts.days, parts.hours, parts.minutes].filter(Boolean)
    expect(chunks).toHaveLength(0)
    expect(parts.seconds).toBe(42)
  })
})
