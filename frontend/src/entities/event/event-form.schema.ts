import { z } from 'zod'
import type { EventFormat, EventKind, EventOrigin } from '@/shared/api/types.gen'

export const EVENT_FORMATS: EventFormat[] = ['ONLINE', 'OFFLINE', 'HYBRID']
export const EVENT_KINDS: EventKind[] = ['HACKATHON', 'MEETUP']
export const EVENT_ORIGINS: EventOrigin[] = ['RU', 'WORLD']

const EXECUTABLE_SCHEMES = ['javascript:', 'data:', 'vbscript:', 'file:']

export function isSafeAbsoluteUrl(value: string): boolean {
  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    return false
  }
  if (!parsed.protocol) return false
  return !EXECUTABLE_SCHEMES.includes(parsed.protocol.toLowerCase())
}

const optionalText = (max: number) => z.string().trim().max(max).optional()

const teamSize = z
  .string()
  .trim()
  .optional()
  .refine((value) => !value || /^\d+$/.test(value), { message: 'event:form.teamSizeInteger' })
  .refine(
    (value) => {
      if (!value) return true
      const parsed = Number(value)
      return parsed >= 1 && parsed <= 100
    },
    { message: 'event:form.teamSizeRange' },
  )

export const eventSchema = z
  .object({
    title: z.string().trim().min(1, 'event:form.titleRequired').max(200),
    organizer: optionalText(200),
    website_url: z
      .string()
      .trim()
      .optional()
      .refine((value) => !value || isSafeAbsoluteUrl(value), { message: 'event:form.urlInvalid' }),
    description: z.string().optional(),
    notes: z.string().optional(),
    kind: z.enum(EVENT_KINDS as [EventKind, ...EventKind[]]),
    format: z.enum(EVENT_FORMATS as [EventFormat, ...EventFormat[]]),
    origin: z.enum(EVENT_ORIGINS as [EventOrigin, ...EventOrigin[]]),
    country_code: z
      .string()
      .trim()
      .optional()
      .refine((value) => !value || /^[A-Za-z]{2}$/.test(value), {
        message: 'event:form.countryInvalid',
      }),
    city: optionalText(120),
    track: optionalText(120),
    prize_pool: z
      .string()
      .trim()
      .optional()
      .refine((value) => !value || /^\d+(\.\d{1,2})?$/.test(value), {
        message: 'event:form.prizePoolInvalid',
      }),
    prize_currency: z
      .string()
      .trim()
      .optional()
      .refine((value) => !value || /^[A-Za-z]{3}$/.test(value), {
        message: 'event:form.prizeCurrencyInvalid',
      }),
    team_size_min: teamSize,
    team_size_max: teamSize,
  })
  .superRefine((values, ctx) => {
    const min = values.team_size_min ? Number(values.team_size_min) : null
    const max = values.team_size_max ? Number(values.team_size_max) : null
    if (min !== null && max !== null && min > max) {
      ctx.addIssue({
        code: 'custom',
        path: ['team_size_min'],
        message: 'event:form.teamSizeOrder',
      })
    }
    if (Boolean(values.prize_pool) !== Boolean(values.prize_currency)) {
      ctx.addIssue({
        code: 'custom',
        path: ['prize_currency'],
        message: 'event:form.prizePairRequired',
      })
    }
    if (values.format !== 'ONLINE' && !values.country_code) {
      ctx.addIssue({
        code: 'custom',
        path: ['country_code'],
        message: 'event:form.countryRequiredOffline',
      })
    }
  })

export type EventFormValues = z.infer<typeof eventSchema>

export const EVENT_FIELD_NAMES = [
  'title',
  'organizer',
  'website_url',
  'description',
  'notes',
  'kind',
  'format',
  'origin',
  'country_code',
  'city',
  'track',
  'prize_pool',
  'prize_currency',
  'team_size_min',
  'team_size_max',
] as const

export const MOMENT_FIELD_NAMES = ['start_at', 'end_at'] as const
