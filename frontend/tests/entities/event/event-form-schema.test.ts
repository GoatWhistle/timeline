import { describe, expect, it } from 'vitest'
import {
  type HackathonFormValues,
  hackathonSchema,
  isSafeAbsoluteUrl,
  type MeetupFormValues,
  meetupSchema,
} from '@/entities/event/event-form.schema'

const COMMON: MeetupFormValues = {
  title: 'National event',
  organizer: '',
  website_url: '',
  description: '',
  format: 'ONLINE',
  origin: 'RU',
  country_code: '',
  city: '',
}

const VALID: HackathonFormValues = {
  ...COMMON,
  track: '',
  prize_pool: '',
  prize_currency: '',
  team_size_min: 1,
  team_size_max: 10,
}

function check(overrides: Partial<HackathonFormValues>) {
  return hackathonSchema.safeParse({ ...VALID, ...overrides })
}

function messagesFor(overrides: Partial<HackathonFormValues>, path: string): string[] {
  const result = check(overrides)
  if (result.success) return []
  return result.error.issues
    .filter((issue: { path: PropertyKey[] }) => issue.path[0] === path)
    .map((issue: { message: string }) => issue.message)
}

describe('the smallest valid event', () => {
  it('needs only a title', () => {
    expect(check({}).success).toBe(true)
  })

  it('refuses an empty or blank title', () => {
    expect(messagesFor({ title: '' }, 'title')).toContain('event:form.titleRequired')
    expect(messagesFor({ title: '   ' }, 'title')).toContain('event:form.titleRequired')
  })

  it('refuses a title beyond two hundred characters', () => {
    expect(check({ title: 'a'.repeat(200) }).success).toBe(true)
    expect(check({ title: 'a'.repeat(201) }).success).toBe(false)
  })
})

describe('the meetup schema knows nothing of the hackathon fields', () => {
  it('accepts a meetup without a prize pool, a track or a team size', () => {
    expect(meetupSchema.safeParse(COMMON).success).toBe(true)
  })

  it('carries no hackathon key through to the parsed value', () => {
    const parsed = meetupSchema.parse({
      ...COMMON,
      track: 'AI',
      prize_pool: '1000',
      prize_currency: 'RUB',
      team_size_min: 2,
      team_size_max: 5,
    })
    for (const key of ['track', 'prize_pool', 'prize_currency', 'team_size_min', 'team_size_max']) {
      expect(parsed, key).not.toHaveProperty(key)
    }
  })

  it('still demands a country for an on-site meetup', () => {
    const result = meetupSchema.safeParse({ ...COMMON, format: 'OFFLINE' })
    expect(result.success).toBe(false)
  })
})

describe('team size is a bounded, ordered pair', () => {
  it('accepts a pair in the right order', () => {
    expect(check({ team_size_min: 2, team_size_max: 5 }).success).toBe(true)
    expect(check({ team_size_min: 3, team_size_max: 3 }).success).toBe(true)
  })

  it('refuses a smallest team larger than the largest', () => {
    expect(messagesFor({ team_size_min: 5, team_size_max: 3 }, 'team_size_min')).toContain(
      'event:form.teamSizeOrder',
    )
  })

  it('refuses a size outside one to ten', () => {
    expect(check({ team_size_min: 0 }).success).toBe(false)
    expect(check({ team_size_max: 11 }).success).toBe(false)
    expect(check({ team_size_min: 1, team_size_max: 10 }).success).toBe(true)
  })

  it('refuses a fractional size', () => {
    expect(check({ team_size_min: 2.5 }).success).toBe(false)
  })
})

describe('the prize pool and its currency travel together', () => {
  it('accepts both together', () => {
    expect(check({ prize_pool: '500000.00', prize_currency: 'RUB' }).success).toBe(true)
    expect(check({ prize_pool: '500000', prize_currency: 'rub' }).success).toBe(true)
  })

  it('refuses a pool without a currency', () => {
    expect(messagesFor({ prize_pool: '1000' }, 'prize_currency')).toContain(
      'event:form.prizePairRequired',
    )
  })

  it('refuses a currency without a pool', () => {
    expect(messagesFor({ prize_currency: 'RUB' }, 'prize_currency')).toContain(
      'event:form.prizePairRequired',
    )
  })

  it('refuses a negative or non-numeric pool', () => {
    expect(messagesFor({ prize_pool: '-5', prize_currency: 'RUB' }, 'prize_pool')).toContain(
      'event:form.prizePoolInvalid',
    )
    expect(messagesFor({ prize_pool: 'lots', prize_currency: 'RUB' }, 'prize_pool')).toContain(
      'event:form.prizePoolInvalid',
    )
  })
})

describe('an on-site event needs a country', () => {
  it('lets an online event omit the country', () => {
    expect(check({ format: 'ONLINE' }).success).toBe(true)
  })

  it('demands a country for an on-site and a hybrid event', () => {
    expect(messagesFor({ format: 'OFFLINE' }, 'country_code')).toContain(
      'event:form.countryRequiredOffline',
    )
    expect(messagesFor({ format: 'HYBRID' }, 'country_code')).toContain(
      'event:form.countryRequiredOffline',
    )
    expect(check({ format: 'OFFLINE', country_code: 'RU' }).success).toBe(true)
  })

  it('refuses a country code that is not two letters', () => {
    expect(messagesFor({ format: 'OFFLINE', country_code: 'RUS' }, 'country_code')).toContain(
      'event:form.countryInvalid',
    )
  })
})

describe('the website address is checked for shape, not for https', () => {
  it('accepts http, https and other schemes the specification allows', () => {
    expect(check({ website_url: 'https://example.com' }).success).toBe(true)
    expect(check({ website_url: 'http://example.com' }).success).toBe(true)
    expect(check({ website_url: 'tg://resolve?domain=x' }).success).toBe(true)
  })

  it('accepts an address typed without a scheme, which is completed with https', () => {
    expect(check({ website_url: 'example.com' }).success).toBe(true)
    expect(check({ website_url: 'example.com/rules' }).success).toBe(true)
  })

  it('refuses text that is not an address at all', () => {
    for (const value of ['ask me on the chat', '/events/42', 'localhost', 'https://']) {
      expect(messagesFor({ website_url: value }, 'website_url')).toContain('event:form.urlInvalid')
    }
  })

  it('refuses the executable schemes', () => {
    for (const scheme of ['javascript:alert(1)', 'data:text/html,x', 'vbscript:x', 'file:///etc']) {
      expect(isSafeAbsoluteUrl(scheme)).toBe(false)
      expect(messagesFor({ website_url: scheme }, 'website_url')).toContain('event:form.urlInvalid')
    }
  })

  it('is not fooled by the case of the scheme', () => {
    expect(isSafeAbsoluteUrl('JavaScript:alert(1)')).toBe(false)
  })
})
