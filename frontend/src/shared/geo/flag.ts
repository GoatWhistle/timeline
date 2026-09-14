import { FLAG_CODES } from './flag-codes.gen'

const CODE_PATTERN = /^[A-Za-z]{2}$/

export function flagSource(code: string | null | undefined): string | null {
  if (!code || !CODE_PATTERN.test(code)) return null
  const lower = code.toLowerCase()
  return FLAG_CODES.has(lower) ? `/flags/${lower}.svg` : null
}
