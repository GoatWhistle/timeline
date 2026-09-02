import { isApiError } from '@/shared/api/errors'
import type { EventResponse } from '@/shared/api/types.gen'
import { civilFromIso, civilToIso } from '@/shared/datetime/civil'
import type { MomentRange } from '@/shared/ui/forms/calendar/moment-range'
import { type EventFormValues, MOMENT_FIELD_NAMES } from './event-form.schema'

export type EventFormPayload = {
  title: string
  start_at: string
  end_at: string
  kind: EventFormValues['kind']
  format: EventFormValues['format']
  origin: EventFormValues['origin']
  organizer?: string
  website_url?: string
  description?: string
  notes?: string
  country_code?: string
  city?: string
  track?: string
  prize_pool?: string
  prize_currency?: string
  team_size_min?: number
  team_size_max?: number
}

export function defaultValues(event: EventResponse | undefined): EventFormValues {
  return {
    title: event?.title ?? '',
    organizer: event?.organizer ?? '',
    website_url: event?.website_url ?? '',
    description: event?.description ?? '',
    notes: event?.notes ?? '',
    kind: event?.kind ?? 'HACKATHON',
    format: event?.format ?? 'ONLINE',
    origin: event?.origin ?? 'RU',
    country_code: event?.country_code ?? '',
    city: event?.city ?? '',
    track: event?.track ?? '',
    prize_pool: event?.prize_pool ?? '',
    prize_currency: event?.prize_currency ?? '',
    team_size_min: event?.team_size_min === undefined ? '' : String(event.team_size_min),
    team_size_max: event?.team_size_max === undefined ? '' : String(event.team_size_max),
  }
}

export function defaultRange(event: EventResponse | undefined): MomentRange {
  return { start: civilFromIso(event?.start_at), end: civilFromIso(event?.end_at) }
}

export function buildPayload(values: EventFormValues, range: MomentRange): EventFormPayload | null {
  const startAt = civilToIso(range.start)
  const endAt = civilToIso(range.end)
  if (startAt === null || endAt === null) return null

  const offline = values.format !== 'ONLINE'
  const country = offline ? values.country_code?.toUpperCase() : undefined
  const city = offline ? values.city : undefined

  return {
    title: values.title,
    start_at: startAt,
    end_at: endAt,
    kind: values.kind,
    format: values.format,
    origin: values.origin,
    ...(values.organizer ? { organizer: values.organizer } : {}),
    ...(values.website_url ? { website_url: values.website_url } : {}),
    ...(values.description ? { description: values.description } : {}),
    ...(values.notes ? { notes: values.notes } : {}),
    ...(country ? { country_code: country } : {}),
    ...(city ? { city } : {}),
    ...(values.track ? { track: values.track } : {}),
    ...(values.prize_pool ? { prize_pool: values.prize_pool } : {}),
    ...(values.prize_currency ? { prize_currency: values.prize_currency.toUpperCase() } : {}),
    ...(values.team_size_min ? { team_size_min: Number(values.team_size_min) } : {}),
    ...(values.team_size_max ? { team_size_max: Number(values.team_size_max) } : {}),
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
