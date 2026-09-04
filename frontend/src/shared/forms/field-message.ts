import type { FieldError } from '@/shared/api/types.gen'
import { i18n } from '@/shared/i18n/config'

const FALLBACK_KEY = 'errors:field.fallback'

export function fieldMessageKey(code: string | undefined): string | undefined {
  if (!code) return undefined
  const key = `errors:field.${code}`
  return i18n.exists(key) ? key : undefined
}

export function fieldMessage(field: FieldError): string {
  const known = fieldMessageKey(field.code)
  if (known) return i18n.t(known)
  if (field.message) return field.message
  return i18n.t(FALLBACK_KEY)
}
