export const AVATAR_ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as const

export const AVATAR_ACCEPT = AVATAR_ACCEPTED_TYPES.join(',')

export const AVATAR_MAX_BYTES = 5 * 1024 * 1024

export type AvatarRejection = 'type' | 'size'

export function rejectionFor(file: File): AvatarRejection | null {
  const type = file.type.toLowerCase()
  if (type && !AVATAR_ACCEPTED_TYPES.includes(type as (typeof AVATAR_ACCEPTED_TYPES)[number])) {
    return 'type'
  }
  if (file.size > AVATAR_MAX_BYTES) return 'size'
  return null
}

export async function downloadAvatar(avatarUrl: string): Promise<void> {
  const response = await fetch(avatarUrl, { credentials: 'include' })
  if (!response.ok) throw new Error(`avatar download failed with status ${response.status}`)
  const url = URL.createObjectURL(await response.blob())
  const link = document.createElement('a')
  link.href = url
  link.download = avatarUrl.split('/').pop() ?? 'avatar'
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
