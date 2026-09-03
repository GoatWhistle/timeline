export const PUBLIC_PROFILE_PREFIX = '/@'

const HANDLE_MARKER = '@'

export function publicProfilePath(nickname: string): string {
  return `${PUBLIC_PROFILE_PREFIX}${nickname}`
}

export function profileNickname(handle: string): string | null {
  if (!handle.startsWith(HANDLE_MARKER)) return null
  const nickname = handle.slice(HANDLE_MARKER.length)
  return nickname === '' ? null : nickname
}

export function isPublicProfileHandle(handle: string): boolean {
  return profileNickname(handle) !== null
}
