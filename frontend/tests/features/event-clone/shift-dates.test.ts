import { describe, expect, it } from 'vitest'
import {
  cloneEventPayload,
  cloneStagePayload,
  shiftDaysBetween,
  shiftIso,
} from '@/features/event-clone/shift-dates'
import type { EventResponse, StageResponse } from '@/shared/api/types.gen'

const event: EventResponse = {
  id: 'e1',
  title: 'National AI Hackathon',
  kind: 'HACKATHON',
  format: 'OFFLINE',
  origin: 'RU',
  effective_format: 'OFFLINE',
  country_code: 'RU',
  city: 'Kazan',
  organizer: 'Committee',
  track: 'Smart city',
  prize_pool: '500000.00',
  prize_currency: 'RUB',
  team_size_max: 5,
  start_at: '2026-10-01T09:00:00Z',
  end_at: '2026-10-20T18:00:00Z',
  state: 'UPCOMING',
  created_at: '2026-09-01T00:00:00Z',
  updated_at: '2026-09-01T00:00:00Z',
}

const stage: StageResponse = {
  id: 's1',
  event_id: 'e1',
  name: 'Final',
  type: 'DEMO',
  start_at: '2026-10-15T10:00:00Z',
  end_at: '2026-10-16T10:00:00Z',
  sort_order: 2,
  venue: 'IT Park',
  place: { format: 'ONLINE', inherited: true },
  created_at: '2026-09-01T00:00:00Z',
  updated_at: '2026-09-01T00:00:00Z',
}

describe('shiftIso', () => {
  it('moves a timestamp by whole days and keeps the time of day', () => {
    expect(shiftIso('2026-10-01T09:00:00Z', 7)).toBe('2026-10-08T09:00:00.000Z')
  })

  it('accepts a negative shift', () => {
    expect(shiftIso('2026-10-08T09:00:00Z', -7)).toBe('2026-10-01T09:00:00.000Z')
  })

  it('returns undefined for a missing or unparsable value', () => {
    expect(shiftIso(undefined, 5)).toBeUndefined()
    expect(shiftIso('not a date', 5)).toBeUndefined()
  })
})

describe('shiftDaysBetween', () => {
  it('counts whole days between two dates', () => {
    expect(shiftDaysBetween('2026-10-01T09:00:00Z', '2026-10-15T00:00:00Z')).toBe(14)
  })

  it('falls back to zero when either end is missing', () => {
    expect(shiftDaysBetween(undefined, '2026-10-15T00:00:00Z')).toBe(0)
    expect(shiftDaysBetween('2026-10-01T09:00:00Z', undefined)).toBe(0)
  })
})

describe('cloneEventPayload', () => {
  it('shifts both ends by the same number of days', () => {
    const payload = cloneEventPayload(event, 'Copy', 30)
    expect(payload.start_at).toBe('2026-10-31T09:00:00.000Z')
    expect(payload.end_at).toBe('2026-11-19T18:00:00.000Z')
  })

  it('carries the descriptive fields over to the copy', () => {
    const payload = cloneEventPayload(event, 'Copy', 0)
    expect(payload).toMatchObject({
      title: 'Copy',
      organizer: 'Committee',
      city: 'Kazan',
      track: 'Smart city',
      prize_pool: '500000.00',
      team_size_max: 5,
    })
  })

  it('omits absent optional fields instead of sending empty values', () => {
    const bare: EventResponse = { ...event, city: undefined, track: undefined }
    const payload = cloneEventPayload(bare, 'Copy', 0)
    expect('city' in payload).toBe(false)
    expect('track' in payload).toBe(false)
  })
})

describe('cloneStagePayload', () => {
  it('shifts stage dates by the same offset as the event', () => {
    const payload = cloneStagePayload(stage, 30)
    expect(payload.start_at).toBe('2026-11-14T10:00:00.000Z')
    expect(payload.end_at).toBe('2026-11-15T10:00:00.000Z')
  })

  it('preserves the ordering and the place of the stage', () => {
    const payload = cloneStagePayload(stage, 30)
    expect(payload.sort_order).toBe(2)
    expect(payload.venue).toBe('IT Park')
  })
})
