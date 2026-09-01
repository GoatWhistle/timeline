export const AVATAR_ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const

export const AVATAR_ACCEPT = AVATAR_ACCEPTED_TYPES.join(',')

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024

export type AvatarRejection = 'type' | 'size'

export function rejectionFor(file: File): AvatarRejection | null {
  const type = file.type.toLowerCase()
  if (type && !AVATAR_ACCEPTED_TYPES.includes(type as (typeof AVATAR_ACCEPTED_TYPES)[number])) {
    return 'type'
  }
  if (file.size > AVATAR_MAX_BYTES) return 'size'
  return null
}
