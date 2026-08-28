import type {
  CreateEventRequest,
  CreateStageRequest,
  EventResponse,
  StageResponse,
} from '@/shared/api/types.gen'

export const DAY_MS = 86400000

export function shiftIso(value: string | undefined, days: number): string | undefined {
  if (!value) return undefined
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) return undefined
  return new Date(parsed + days * DAY_MS).toISOString()
}

export function shiftDaysBetween(from: string | undefined, to: string | undefined): number {
  if (!from || !to) return 0
  const a = Date.parse(from)
  const b = Date.parse(to)
  if (Number.isNaN(a) || Number.isNaN(b)) return 0
  return Math.round((b - a) / DAY_MS)
}

export function cloneEventPayload(
  event: EventResponse,
  title: string,
  days: number,
): CreateEventRequest {
  const payload: CreateEventRequest = { title }
  const start = shiftIso(event.start_at, days)
  const end = shiftIso(event.end_at, days)

  if (start) payload.start_at = start
  if (end) payload.end_at = end
  if (event.organizer) payload.organizer = event.organizer
  if (event.description) payload.description = event.description
  if (event.notes) payload.notes = event.notes
  if (event.website_url) payload.website_url = event.website_url
  if (event.kind) payload.kind = event.kind
  if (event.format) payload.format = event.format
  if (event.origin) payload.origin = event.origin
  if (event.country_code) payload.country_code = event.country_code
  if (event.city) payload.city = event.city
  if (event.track) payload.track = event.track
  if (event.prize_pool) payload.prize_pool = event.prize_pool
  if (event.prize_currency) payload.prize_currency = event.prize_currency
  if (typeof event.team_size_max === 'number') payload.team_size_max = event.team_size_max

  return payload
}

export function cloneStagePayload(stage: StageResponse, days: number): CreateStageRequest {
  const payload: CreateStageRequest = {}
  const start = shiftIso(stage.start_at, days)
  const end = shiftIso(stage.end_at, days)

  if (stage.name) payload.name = stage.name
  if (stage.type) payload.type = stage.type
  if (start) payload.start_at = start
  if (end) payload.end_at = end
  if (stage.description) payload.description = stage.description
  if (stage.url) payload.url = stage.url
  if (stage.format) payload.format = stage.format
  if (stage.country_code) payload.country_code = stage.country_code
  if (stage.city) payload.city = stage.city
  if (stage.venue) payload.venue = stage.venue
  if (stage.online_url) payload.online_url = stage.online_url
  if (typeof stage.sort_order === 'number') payload.sort_order = stage.sort_order

  return payload
}
