import type { CatalogParams } from '@/entities/catalog/catalog.queries'
import { dayEndIso, dayStartIso } from '@/shared/datetime/civil'

export const CATALOG_DEFAULTS = {
  origin: '',
  kind: '',
  format: '',
  state: '',
  layout: 'table',
  selected: '',
  sort: '',
  order: '',
  joined: '',
  from: '',
  to: '',
}

export const CATALOG_FILTER_FIELDS_URL = [
  'state',
  'format',
  'kind',
  'origin',
  'joined',
  'from',
  'to',
] as const

export function listParam<K extends 'origin' | 'kind' | 'format' | 'state'>(
  value: string,
): CatalogParams[K] {
  return (value === '' ? undefined : value) as CatalogParams[K]
}

export function joinedParam(value: string): boolean | undefined {
  if (value === 'true') return true
  if (value === 'false') return false
  return undefined
}

export function startOfDay(value: string): string | undefined {
  return dayStartIso(value)
}

export function endOfDay(value: string): string | undefined {
  return dayEndIso(value)
}
