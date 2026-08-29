import { z } from 'zod'
import { parseExternalUrl } from '@/shared/ui/navigation/external-link/external-url'

export const LINK_FIELDS = ['avatar_url', 'github_url', 'website_url'] as const

const BLOCKED_SCHEMES = new Set(['javascript:', 'data:', 'vbscript:', 'file:'])

export function isAcceptedProfileLink(value: string): boolean {
  const trimmed = value.trim()
  if (trimmed === '') return true

  const parsed = parseExternalUrl(trimmed)
  if (parsed === null || parsed.host === '') return false
  return !BLOCKED_SCHEMES.has(parsed.protocol)
}

const link = z
  .string()
  .max(2048, 'validation.linkTooLong')
  .refine(isAcceptedProfileLink, 'validation.linkScheme')

export const linksSchema = z.object({
  avatar_url: link,
  github_url: link,
  website_url: link,
  bio: z.string().max(2000, 'validation.bioTooLong'),
})

export type LinksValues = z.infer<typeof linksSchema>
