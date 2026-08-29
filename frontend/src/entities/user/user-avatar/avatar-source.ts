import { isBrowserScheme } from '@/shared/ui/navigation/external-link/external-url'

export function isDisplayableAvatar(href: string | null | undefined): boolean {
  if (typeof href !== 'string') return false
  const trimmed = href.trim()
  if (trimmed === '') return false
  return isBrowserScheme(trimmed)
}
