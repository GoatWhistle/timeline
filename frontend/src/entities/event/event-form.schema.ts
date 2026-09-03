import { z } from 'zod'
import type { EventFormat, EventKind, EventOrigin } from '@/shared/api/types.gen'
import { isLinkableUrl } from '@/shared/forms/url'

export const EVENT_FORMATS: EventFormat[] = ['ONLINE', 'OFFLINE', 'HYBRID']
export const EVENT_KINDS: EventKind[] = ['HACKATHON', 'MEETUP']
export const EVENT_ORIGINS: EventOrigin[] = ['RU', 'WORLD']

export const TEAM_SIZE_MIN = 1
export const TEAM_SIZE_MAX = 10

export function isSafeAbsoluteUrl(value: string): boolean {
  return isLinkableUrl(value)
}

const optionalText = (max: number) => z.string().trim().max(max).optional()

export const commonEventShape = {
  title: z.string().trim().min(1, 'event:form.titleRequired').max(200),
  organizer: optionalText(200),
  website_url: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || isSafeAbsoluteUrl(value), { message: 'event:form.urlInvalid' }),
  description: z.string().optional(),
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
}

export const hackathonOnlyShape = {
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
  team_size_min: z.number().int().min(TEAM_SIZE_MIN).max(TEAM_SIZE_MAX),
  team_size_max: z.number().int().min(TEAM_SIZE_MIN).max(TEAM_SIZE_MAX),
}

export function requireCountryOffline(
  values: { format: EventFormat; country_code?: string | undefined },
  ctx: z.RefinementCtx,
): void {
  if (values.format !== 'ONLINE' && !values.country_code) {
    ctx.addIssue({
      code: 'custom',
      path: ['country_code'],
      message: 'event:form.countryRequiredOffline',
    })
  }
}

export const meetupSchema = z.object(commonEventShape).superRefine(requireCountryOffline)

export const hackathonSchema = z
  .object({ ...commonEventShape, ...hackathonOnlyShape })
  .superRefine((values, ctx) => {
    requireCountryOffline(values, ctx)
    if (values.team_size_min > values.team_size_max) {
      ctx.addIssue({ code: 'custom', path: ['team_size_min'], message: 'event:form.teamSizeOrder' })
    }
    if (Boolean(values.prize_pool) !== Boolean(values.prize_currency)) {
      ctx.addIssue({
        code: 'custom',
        path: ['prize_currency'],
        message: 'event:form.prizePairRequired',
      })
    }
  })

export type MeetupFormValues = z.infer<typeof meetupSchema>
export type HackathonFormValues = z.infer<typeof hackathonSchema>

export const COMMON_FIELD_NAMES = [
  'title',
  'organizer',
  'website_url',
  'description',
  'format',
  'origin',
  'country_code',
  'city',
] as const

export const HACKATHON_FIELD_NAMES = [
  ...COMMON_FIELD_NAMES,
  'track',
  'prize_pool',
  'prize_currency',
  'team_size_min',
  'team_size_max',
] as const

export const MOMENT_FIELD_NAMES = ['start_at', 'end_at'] as const
