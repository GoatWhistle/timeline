import { z } from 'zod'
import { normalizeLinkUrl } from '@/shared/ui/navigation/service-link/detect-service'

export function isAcceptedProfileLink(value: string): boolean {
  const trimmed = value.trim()
  if (trimmed === '') return true
  return normalizeLinkUrl(trimmed) !== null
}

export const newLinkSchema = z.object({
  url: z
    .string()
    .trim()
    .min(1, 'validation.linkRequired')
    .max(2048, 'validation.linkTooLong')
    .refine((value) => normalizeLinkUrl(value) !== null, 'validation.linkScheme'),
  label: z.string().trim().max(100, 'validation.labelTooLong'),
})

export type NewLinkValues = z.infer<typeof newLinkSchema>
