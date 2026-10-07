import type { AuditParams } from '@/entities/audit/audit.queries'
import type { AuditAction, EntityType } from '@/shared/api/types.gen'
import { dayEndIso, dayStartIso } from '@/shared/datetime/civil'

export const AUDIT_SORTS = ['created_at', 'actor', 'action', 'entity_type'] as const
export type AuditSort = (typeof AUDIT_SORTS)[number]
export type AuditOrder = 'asc' | 'desc'

export const DEFAULT_AUDIT_SORT: AuditSort = 'created_at'
export const DEFAULT_AUDIT_ORDER: AuditOrder = 'desc'

export const AUDIT_DEFAULTS = {
  search: '',
  action: '',
  entity: '',
  from: '',
  to: '',
  sort: '',
  order: '',
}

export type AuditFilterState = typeof AUDIT_DEFAULTS

export type AuditParamsShape = AuditParams

export function resolveAuditSort(value: string): AuditSort {
  return (AUDIT_SORTS as readonly string[]).includes(value)
    ? (value as AuditSort)
    : DEFAULT_AUDIT_SORT
}

export function resolveAuditOrder(value: string): AuditOrder {
  return value === 'asc' || value === 'desc' ? value : DEFAULT_AUDIT_ORDER
}

export function nextAuditSort(
  current: AuditSort,
  order: AuditOrder,
  clicked: AuditSort,
): { sort: AuditSort; order: AuditOrder } {
  if (clicked === current) return { sort: current, order: order === 'asc' ? 'desc' : 'asc' }
  return { sort: clicked, order: clicked === 'created_at' ? 'desc' : 'asc' }
}

export function auditParams(filters: AuditFilterState, search: string, page: number): AuditParams {
  const from = dayStartIso(filters.from)
  const to = dayEndIso(filters.to)
  return {
    page,
    ...(search ? { search } : {}),
    ...(filters.action ? { action: filters.action as AuditAction } : {}),
    ...(filters.entity ? { entity_type: filters.entity as EntityType } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
    sort: resolveAuditSort(filters.sort),
    order: resolveAuditOrder(filters.order),
  }
}

export function auditFiltered(filters: AuditFilterState, search: string): boolean {
  return (
    search !== '' ||
    filters.action !== '' ||
    filters.entity !== '' ||
    filters.from !== '' ||
    filters.to !== ''
  )
}
