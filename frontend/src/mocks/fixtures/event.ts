import type { EventResponse, EventState } from '@/shared/api/types.gen'
import { at } from './clock'

function event(
  id: string,
  title: string,
  startOffset: number,
  endOffset: number,
  overrides: Partial<EventResponse> = {},
): EventResponse {
  return {
    id,
    title,
    start_at: at(startOffset),
    end_at: at(endOffset),
    state: 'UPCOMING',
    kind: 'HACKATHON',
    format: 'ONLINE',
    origin: 'RU',
    effective_format: 'ONLINE',
    created_at: at(-60),
    updated_at: at(-5),
    published_at: at(-50),
    ...overrides,
  }
}

export const events: EventResponse[] = [
  event('11111111-1111-4111-8111-111111111111', 'National AI Hackathon', 14, 21, {
    organizer: 'Digital Economy',
    website_url: 'https://example.com/ai-hack',
    description: 'A team competition on applied machine learning problems.',
    notes: 'Contact person on the organisers side - Smirnov.',
    effective_format: 'HYBRID',
    track: 'Hypothesis factory',
    prize_pool: '500000.00',
    prize_currency: 'RUB',
    team_size_max: 5,
  }),
  event('22222222-2222-4222-8222-222222222222', 'Fintech Marathon', -2, 5, {
    organizer: 'Development Bank',
    website_url: 'https://example.com/fintech',
    description: 'Building services for small business.',
  }),
  event('33333333-3333-4333-8333-333333333333', 'Smart City Event', -60, -40, {
    organizer: 'Transport Department',
    description: 'Urban infrastructure challenges.',
    format: 'OFFLINE',
    effective_format: 'OFFLINE',
    country_code: 'RU',
    city: 'Moscow',
    track: 'Smart city',
    prize_pool: '15000.00',
    prize_currency: 'USD',
  }),
  event('44444444-4444-4444-8444-444444444444', 'Internal Platform Hackathon', 30, 33, {
    organizer: 'Internal',
    published_at: undefined,
    notes: 'Draft, dates to be confirmed.',
  }),
  event('55555555-5555-4555-8555-555555555555', 'Event of 2025', -400, -395, {
    organizer: 'Last Year',
    archived_at: at(-380),
  }),
]

export function eventState(item: EventResponse): EventState {
  if (item.archived_at) return 'ARCHIVED'
  if (!item.published_at) return 'UNPUBLISHED'
  const current = Date.now()
  if (current < Date.parse(item.start_at)) return 'UPCOMING'
  if (current > Date.parse(item.end_at)) return 'FINISHED'
  return 'ACTIVE'
}

export function withState(item: EventResponse): EventResponse {
  return { ...item, state: eventState(item) }
}
