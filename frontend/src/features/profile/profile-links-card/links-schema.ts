import { z } from 'zod'
import { isAcceptedUrl, normalizeFormUrl } from '@/shared/forms/url'

export function isAcceptedProfileLink(value: string): boolean {
  const trimmed = value.trim()
  if (trimmed === '') return true
  return isAcceptedUrl(trimmed)
}

export const newLinkSchema = z.object({
  url: z
    .string()
    .trim()
    .min(1, 'validation.linkRequired')
    .max(2048, 'validation.linkTooLong')
    .refine(isAcceptedUrl, 'validation.linkScheme')
    .transform((value) => normalizeFormUrl(value) ?? value),
  label: z.string().trim().max(100, 'validation.labelTooLong'),
})

export type NewLinkValues = z.infer<typeof newLinkSchema>
