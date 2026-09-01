import { isBrowserScheme } from '@/shared/ui/navigation/external-link/external-url'

const STORED_AVATAR_PREFIX = '/api/v1/avatars/'

export function isStoredAvatar(href: string): boolean {
  return href.startsWith(STORED_AVATAR_PREFIX) && !href.slice(1).includes('//')
}

export function isDisplayableAvatar(href: string | null | undefined): boolean {
  if (typeof href !== 'string') return false
  const trimmed = href.trim()
  if (trimmed === '') return false
  if (isStoredAvatar(trimmed)) return true
  return isBrowserScheme(trimmed)
}
