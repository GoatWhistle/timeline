import type { CatalogParams } from '@/entities/catalog/catalog.queries'

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
  if (value === '') return undefined
  const parsed = new Date(`${value}T00:00:00`)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString()
}

export function endOfDay(value: string): string | undefined {
  if (value === '') return undefined
  const parsed = new Date(`${value}T23:59:59.999`)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString()
}
