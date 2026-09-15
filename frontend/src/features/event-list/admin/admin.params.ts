import type { CatalogOrder, CatalogSort } from '@/entities/catalog/catalog.views'
import type { QueryParams } from '@/shared/api/params'
import { dayEndIso, dayStartIso } from '@/shared/datetime/civil'

export type AdminListParams = QueryParams<'/admin/events', 'get'>

export const ADMIN_DEFAULTS = {
  search: '',
  state: '',
  kind: '',
  format: '',
  origin: '',
  archived: '',
  from: '',
  to: '',
  layout: 'table',
  selected: '',
  sort: '',
  order: '',
}

type AdminFilterState = typeof ADMIN_DEFAULTS

function listParam<K extends 'origin' | 'kind' | 'format' | 'state'>(
  value: string,
): AdminListParams[K] {
  return (value === '' ? undefined : value) as AdminListParams[K]
}

export function adminListParams(
  filters: AdminFilterState,
  search: string,
  sort: CatalogSort,
  order: CatalogOrder,
  page: number,
): AdminListParams {
  return {
    page,
    ...(search ? { search } : {}),
    state: listParam<'state'>(filters.state),
    kind: listParam<'kind'>(filters.kind),
    format: listParam<'format'>(filters.format),
    origin: listParam<'origin'>(filters.origin),
    ...(filters.archived === 'true' ? { include_archived: true } : {}),
    from: dayStartIso(filters.from),
    to: dayEndIso(filters.to),
    sort,
    order,
  }
}
