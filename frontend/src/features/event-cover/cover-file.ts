export const COVER_ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const

export const COVER_ACCEPT = COVER_ACCEPTED_TYPES.join(',')

export const COVER_MAX_BYTES = 5 * 1024 * 1024

export type CoverRejection = 'type' | 'size'

export function coverRejectionFor(file: File): CoverRejection | null {
  const type = file.type.toLowerCase()
  if (type && !COVER_ACCEPTED_TYPES.includes(type as (typeof COVER_ACCEPTED_TYPES)[number])) {
    return 'type'
  }
  if (file.size > COVER_MAX_BYTES) return 'size'
  return null
}
