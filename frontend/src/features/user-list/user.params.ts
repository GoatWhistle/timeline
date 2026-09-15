import type { CatalogOrder } from '@/entities/catalog/catalog.views'
import type { UserSort } from '@/entities/user/user.views'
import type { UsersParams } from '@/shared/api/directory'

export const USER_DEFAULTS = {
  query: '',
  active: '',
  admin: '',
  telegram: '',
  sort: '',
  order: '',
  selected: '',
}

type UserFilterState = typeof USER_DEFAULTS

function triState(value: string): boolean | undefined {
  if (value === 'true') return true
  if (value === 'false') return false
  return undefined
}

export function userListParams(
  filters: UserFilterState,
  query: string,
  sort: UserSort,
  order: CatalogOrder,
  page: number,
): UsersParams {
  return {
    page,
    ...(query ? { query } : {}),
    active: triState(filters.active),
    admin: triState(filters.admin),
    telegram: triState(filters.telegram),
    sort,
    order,
  }
}

export function activeUserFilters(filters: UserFilterState): number {
  return [filters.active, filters.admin, filters.telegram].filter((value) => value !== '').length
}
