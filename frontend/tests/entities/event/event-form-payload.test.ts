import { afterEach, describe, expect, it } from 'vitest'
import {
  buildPayload,
  defaultRange,
  defaultValues,
  momentServerError,
} from '@/entities/event/event-form.payload'
import { ApiError } from '@/shared/api/errors'
import type { EventResponse } from '@/shared/api/types.gen'
import { setTimeZone } from '@/shared/datetime/datetime'

const BASE = {
  title: 'National event',
  organizer: '',
  website_url: '',
  description: '',
  notes: '',
  kind: 'HACKATHON' as const,
  format: 'ONLINE' as const,
  origin: 'RU' as const,
  country_code: '',
  city: '',
  track: '',
  prize_pool: '',
  prize_currency: '',
  team_size_min: '',
  team_size_max: '',
}

const RANGE = {
  start: { date: '2026-05-01', time: '10:00' },
  end: { date: '2026-05-03', time: '18:00' },
}

afterEach(() => setTimeZone(undefined))

describe('the payload carries the instant the administrator meant', () => {
  it('sends UTC for a time entered in the profile zone', () => {
    setTimeZone('Europe/Moscow')
    const payload = buildPayload(BASE, RANGE)
    expect(payload?.start_at).toBe('2026-05-01T07:00:00.000Z')
    expect(payload?.end_at).toBe('2026-05-03T15:00:00.000Z')
  })

  it('sends a different instant for the same wall clock in another zone', () => {
    setTimeZone('Asia/Vladivostok')
    const payload = buildPayload(BASE, RANGE)
    expect(payload?.start_at).toBe('2026-05-01T00:00:00.000Z')
  })

  it('refuses to build a payload from an incomplete range', () => {
    setTimeZone('Europe/Moscow')
    expect(buildPayload(BASE, { start: { date: '', time: '' }, end: RANGE.end })).toBeNull()
    expect(
      buildPayload(BASE, { start: RANGE.start, end: { date: '2026-05-03', time: '' } }),
    ).toBeNull()
  })
})

describe('optional fields are omitted rather than sent empty', () => {
  it('leaves out every untouched field', () => {
    setTimeZone('Europe/Moscow')
    const payload = buildPayload(BASE, RANGE)
    expect(payload).not.toHaveProperty('organizer')
    expect(payload).not.toHaveProperty('track')
    expect(payload).not.toHaveProperty('prize_pool')
    expect(payload).not.toHaveProperty('team_size_min')
  })

  it('normalizes the currency and the country to upper case', () => {
    setTimeZone('Europe/Moscow')
    const payload = buildPayload(
      { ...BASE, format: 'OFFLINE', country_code: 'ru', prize_pool: '10', prize_currency: 'rub' },
      RANGE,
    )
    expect(payload?.country_code).toBe('RU')
    expect(payload?.prize_currency).toBe('RUB')
  })

  it('sends the team bounds as numbers, not strings', () => {
    setTimeZone('Europe/Moscow')
    const payload = buildPayload({ ...BASE, team_size_min: '2', team_size_max: '5' }, RANGE)
    expect(payload?.team_size_min).toBe(2)
    expect(payload?.team_size_max).toBe(5)
  })

  it('drops the place of an event that turned online', () => {
    setTimeZone('Europe/Moscow')
    const payload = buildPayload(
      { ...BASE, format: 'ONLINE', country_code: 'RU', city: 'Moscow' },
      RANGE,
    )
    expect(payload).not.toHaveProperty('country_code')
    expect(payload).not.toHaveProperty('city')
  })
})

describe('editing starts from what the server holds', () => {
  const event = {
    id: 'ev_1',
    title: 'Existing',
    kind: 'MEETUP',
    format: 'HYBRID',
    origin: 'WORLD',
    country_code: 'DE',
    city: 'Berlin',
    track: 'Smart city',
    prize_pool: '500000.00',
    prize_currency: 'EUR',
    team_size_min: 3,
    team_size_max: 5,
    start_at: '2026-05-01T07:00:00Z',
    end_at: '2026-05-03T15:00:00Z',
    state: 'UPCOMING',
    effective_format: 'HYBRID',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  } as EventResponse

  it('fills every field from the response', () => {
    const values = defaultValues(event)
    expect(values.title).toBe('Existing')
    expect(values.kind).toBe('MEETUP')
    expect(values.format).toBe('HYBRID')
    expect(values.origin).toBe('WORLD')
    expect(values.country_code).toBe('DE')
    expect(values.city).toBe('Berlin')
    expect(values.track).toBe('Smart city')
    expect(values.prize_pool).toBe('500000.00')
    expect(values.prize_currency).toBe('EUR')
    expect(values.team_size_min).toBe('3')
    expect(values.team_size_max).toBe('5')
  })

  it('shows the stored instant in the profile zone', () => {
    setTimeZone('Europe/Moscow')
    expect(defaultRange(event)).toEqual({
      start: { date: '2026-05-01', time: '10:00' },
      end: { date: '2026-05-03', time: '18:00' },
    })
  })

  it('saves back the same instant it loaded when nothing was touched', () => {
    setTimeZone('Europe/Moscow')
    const payload = buildPayload(defaultValues(event), defaultRange(event))
    expect(payload?.start_at).toBe('2026-05-01T07:00:00.000Z')
    expect(payload?.end_at).toBe('2026-05-03T15:00:00.000Z')
  })

  it('starts an empty form on the defaults of the specification', () => {
    const values = defaultValues(undefined)
    expect(values.kind).toBe('HACKATHON')
    expect(values.format).toBe('ONLINE')
    expect(values.origin).toBe('RU')
    expect(defaultRange(undefined)).toEqual({
      start: { date: '', time: '' },
      end: { date: '', time: '' },
    })
  })
})

describe('a server complaint about the period reaches the calendar', () => {
  it('picks out an error on the start or the end', () => {
    const error = new ApiError(400, {
      code: 'validation_failed',
      fields: [{ field: 'end_at', message: 'must be later than start_at' }],
    })
    expect(momentServerError(error)).toBe('must be later than start_at')
  })

  it('ignores an error about another field', () => {
    const error = new ApiError(400, {
      code: 'validation_failed',
      fields: [{ field: 'title', message: 'required' }],
    })
    expect(momentServerError(error)).toBeNull()
  })

  it('ignores anything that is not an API error', () => {
    expect(momentServerError(new Error('offline'))).toBeNull()
  })
})
