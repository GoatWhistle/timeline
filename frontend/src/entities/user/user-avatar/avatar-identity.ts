const HUE_COUNT = 360

export function avatarHue(seed: string): number {
  let hash = 0
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 2147483647
  }
  return hash % HUE_COUNT
}

export function personInitials(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  fallback = '?',
): string {
  const first = [...(firstName ?? '').trim()][0] ?? ''
  const last = [...(lastName ?? '').trim()][0] ?? ''
  const result = `${first}${last}`.toLocaleUpperCase()
  return result || fallback
}

export function initials(displayName: string | null | undefined, fallback = '?'): string {
  const source = (displayName ?? '').trim()
  if (!source) return fallback

  const words = source.split(/\s+/).filter(Boolean)
  const first = words[0]?.[0] ?? ''
  const second = words.length > 1 ? (words[words.length - 1]?.[0] ?? '') : ''
  const result = `${first}${second}`.toLocaleUpperCase()
  return result || fallback
}
