import { isApiError } from '@/shared/api/errors'
import type { EventKind, EventResponse } from '@/shared/api/types.gen'
import { civilFromIso, civilToIso } from '@/shared/datetime/civil'
import { normalizeLinkableUrl } from '@/shared/forms/url'
import type { MomentRange } from '@/shared/ui/forms/calendar/moment-range'
import {
  type HackathonFormValues,
  type MeetupFormValues,
  MOMENT_FIELD_NAMES,
  TEAM_SIZE_MAX,
  TEAM_SIZE_MIN,
} from './event-form.schema'

export type EventFormPayload = {
  title: string
  start_at: string
  end_at: string
  kind: EventKind
  format: MeetupFormValues['format']
  origin: MeetupFormValues['origin']
  organizer?: string
  website_url?: string
  description?: string
  country_code?: string
  city?: string
  track?: string
  prize_pool?: string
  prize_currency?: string
  team_size_min?: number
  team_size_max?: number
}

export function commonDefaults(event: EventResponse | undefined): MeetupFormValues {
  return {
    title: event?.title ?? '',
    organizer: event?.organizer ?? '',
    website_url: event?.website_url ?? '',
    description: event?.description ?? '',
    format: event?.format ?? 'ONLINE',
    origin: event?.origin ?? 'RU',
    country_code: event?.country_code ?? '',
    city: event?.city ?? '',
  }
}

export function hackathonDefaults(event: EventResponse | undefined): HackathonFormValues {
  return {
    ...commonDefaults(event),
    prize_pool: event?.prize_pool ?? '',
    prize_currency: event?.prize_currency ?? '',
    team_size_min: event?.team_size_min ?? TEAM_SIZE_MIN,
    team_size_max: event?.team_size_max ?? TEAM_SIZE_MAX,
  }
}

export function defaultRange(event: EventResponse | undefined): MomentRange {
  return { start: civilFromIso(event?.start_at), end: civilFromIso(event?.end_at) }
}

function commonPayload(
  values: MeetupFormValues,
  kind: EventKind,
  startAt: string,
  endAt: string,
): EventFormPayload {
  const offline = values.format !== 'ONLINE'
  const country = offline ? values.country_code?.toUpperCase() : undefined
  const city = offline ? values.city : undefined

  return {
    title: values.title,
    start_at: startAt,
    end_at: endAt,
    kind,
    format: values.format,
    origin: values.origin,
    ...(values.organizer ? { organizer: values.organizer } : {}),
    ...(values.website_url
      ? { website_url: normalizeLinkableUrl(values.website_url) ?? values.website_url }
      : {}),
    ...(values.description ? { description: values.description } : {}),
    ...(country ? { country_code: country } : {}),
    ...(city ? { city } : {}),
  }
}

export function buildMeetupPayload(
  values: MeetupFormValues,
  range: MomentRange,
): EventFormPayload | null {
  const startAt = civilToIso(range.start)
  const endAt = civilToIso(range.end)
  if (startAt === null || endAt === null) return null
  return commonPayload(values, 'MEETUP', startAt, endAt)
}

export function buildHackathonPayload(
  values: HackathonFormValues,
  range: MomentRange,
): EventFormPayload | null {
  const startAt = civilToIso(range.start)
  const endAt = civilToIso(range.end)
  if (startAt === null || endAt === null) return null

  return {
    ...commonPayload(values, 'HACKATHON', startAt, endAt),
    ...(values.prize_pool ? { prize_pool: values.prize_pool } : {}),
    ...(values.prize_currency ? { prize_currency: values.prize_currency.toUpperCase() } : {}),
    team_size_min: values.team_size_min,
    team_size_max: values.team_size_max,
  }
}

export function momentServerError(error: unknown): string | null {
  if (!isApiError(error)) return null
  for (const field of error.fields) {
    if ((MOMENT_FIELD_NAMES as readonly string[]).includes(field.field ?? '')) {
      return field.message ?? null
    }
  }
  return null
}
