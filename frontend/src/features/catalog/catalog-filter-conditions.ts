import {
  CATALOG_FORMAT_KEY,
  CATALOG_FORMATS,
  CATALOG_KIND_KEY,
  CATALOG_KINDS,
  CATALOG_PARTICIPATION,
  CATALOG_PARTICIPATION_KEY,
  CATALOG_SCOPE_KEY,
  CATALOG_SCOPES,
  CATALOG_STATE_KEY,
  CATALOG_STATES,
} from '@/entities/catalog/catalog.views'

export const CATALOG_FILTER_FIELDS = [
  'state',
  'format',
  'kind',
  'origin',
  'joined',
  'from',
  'to',
] as const
export type CatalogFilterField = (typeof CATALOG_FILTER_FIELDS)[number]

export const CATALOG_FILTER_FIELD_KEY: Record<CatalogFilterField, string> = {
  state: 'catalog.field.state',
  format: 'catalog.field.format',
  kind: 'catalog.field.kind',
  origin: 'catalog.field.origin',
  joined: 'catalog.field.joined',
  from: 'catalog.field.from',
  to: 'catalog.field.to',
}

export const CATALOG_FILTER_OPERATOR_KEY: Record<CatalogFilterField, string> = {
  state: 'catalog.operator.is',
  format: 'catalog.operator.is',
  kind: 'catalog.operator.is',
  origin: 'catalog.operator.is',
  joined: 'catalog.operator.is',
  from: 'catalog.operator.onOrAfter',
  to: 'catalog.operator.onOrBefore',
}

export type CatalogFilterValues = Record<CatalogFilterField, string>

export type CatalogFilterOption = { value: string; labelKey: string }

const CHOICES: Partial<Record<CatalogFilterField, readonly CatalogFilterOption[]>> = {
  state: CATALOG_STATES.filter((value) => value !== '').map((value) => ({
    value,
    labelKey: CATALOG_STATE_KEY[value],
  })),
  format: CATALOG_FORMATS.filter((value) => value !== '').map((value) => ({
    value,
    labelKey: CATALOG_FORMAT_KEY[value],
  })),
  kind: CATALOG_KINDS.filter((value) => value !== '').map((value) => ({
    value,
    labelKey: CATALOG_KIND_KEY[value],
  })),
  origin: CATALOG_SCOPES.filter((value) => value !== '').map((value) => ({
    value,
    labelKey: CATALOG_SCOPE_KEY[value],
  })),
  joined: CATALOG_PARTICIPATION.filter((value) => value !== '').map((value) => ({
    value,
    labelKey: CATALOG_PARTICIPATION_KEY[value],
  })),
}

export function filterChoices(field: CatalogFilterField): readonly CatalogFilterOption[] {
  return CHOICES[field] ?? []
}

export function isDateField(field: CatalogFilterField): boolean {
  return field === 'from' || field === 'to'
}

export function activeFields(values: CatalogFilterValues): CatalogFilterField[] {
  return CATALOG_FILTER_FIELDS.filter((field) => values[field] !== '')
}

export function activeFilterCount(values: CatalogFilterValues): number {
  return activeFields(values).length
}

export function firstUnusedField(values: CatalogFilterValues): CatalogFilterField | null {
  return CATALOG_FILTER_FIELDS.find((field) => values[field] === '') ?? null
}

export function defaultValueFor(field: CatalogFilterField): string {
  if (isDateField(field)) return ''
  return filterChoices(field)[0]?.value ?? ''
}
