const ALLOWED_CHARS = /^[A-Za-z0-9_-]*$/
const EDGE_CHARS = /^[A-Za-z0-9].*[A-Za-z0-9]$/

export const NICKNAME_MIN = 3
export const NICKNAME_MAX = 39

export function nicknameProblem(value: string): string | null {
  if (value === '') return null
  if (!ALLOWED_CHARS.test(value)) return 'auth:validation.nicknameChars'
  if (value.length < NICKNAME_MIN) return 'auth:validation.nicknameMin'
  if (value.length > NICKNAME_MAX) return 'auth:validation.nicknameMax'
  if (!EDGE_CHARS.test(value)) return 'auth:validation.nicknameEdges'
  return null
}
