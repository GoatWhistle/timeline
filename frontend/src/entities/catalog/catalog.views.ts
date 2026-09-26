export const CATALOG_SCOPES = ['', 'RU', 'WORLD'] as const
export type CatalogScope = (typeof CATALOG_SCOPES)[number]

export const CATALOG_SCOPE_KEY: Record<CatalogScope, string> = {
  '': 'catalog.scope.all',
  RU: 'catalog.scope.russia',
  WORLD: 'catalog.scope.world',
}

export const CATALOG_KINDS = ['', 'HACKATHON', 'MEETUP'] as const
export type CatalogKindFilter = (typeof CATALOG_KINDS)[number]

export const CATALOG_KIND_KEY: Record<CatalogKindFilter, string> = {
  '': 'catalog.kind.all',
  HACKATHON: 'catalog.kind.hackathons',
  MEETUP: 'catalog.kind.meetups',
}

export const CATALOG_STATES = ['', 'UPCOMING', 'ACTIVE', 'FINISHED'] as const
export type CatalogStateFilter = (typeof CATALOG_STATES)[number]

export const CATALOG_STATE_KEY: Record<CatalogStateFilter, string> = {
  '': 'catalog.state.all',
  UPCOMING: 'catalog.state.upcoming',
  ACTIVE: 'catalog.state.active',
  FINISHED: 'catalog.state.finished',
}

export const ADMIN_STATES = [
  '',
  'UNPUBLISHED',
  'UPCOMING',
  'ACTIVE',
  'FINISHED',
  'ARCHIVED',
] as const
export type AdminStateFilter = (typeof ADMIN_STATES)[number]

export const ADMIN_STATE_KEY: Record<AdminStateFilter, string> = {
  '': 'catalog.state.all',
  UNPUBLISHED: 'catalog.state.unpublished',
  UPCOMING: 'catalog.state.upcoming',
  ACTIVE: 'catalog.state.active',
  FINISHED: 'catalog.state.finished',
  ARCHIVED: 'catalog.state.archived',
}

export const ADMIN_ARCHIVED = ['', 'true', 'false'] as const
export type AdminArchivedFilter = (typeof ADMIN_ARCHIVED)[number]

export const ADMIN_ARCHIVED_KEY: Record<AdminArchivedFilter, string> = {
  '': 'catalog.archived.hidden',
  true: 'catalog.archived.shown',
  false: 'catalog.archived.hidden',
}

export const CATALOG_FORMATS = ['', 'OFFLINE', 'ONLINE', 'HYBRID'] as const
export type CatalogFormatFilter = (typeof CATALOG_FORMATS)[number]

export const CATALOG_FORMAT_KEY: Record<CatalogFormatFilter, string> = {
  '': 'catalog.format.all',
  OFFLINE: 'catalog.format.offline',
  ONLINE: 'catalog.format.online',
  HYBRID: 'catalog.format.hybrid',
}

export const CATALOG_PARTICIPATION = ['', 'true', 'false'] as const
export type CatalogParticipationFilter = (typeof CATALOG_PARTICIPATION)[number]

export const CATALOG_PARTICIPATION_KEY: Record<CatalogParticipationFilter, string> = {
  '': 'catalog.participation.all',
  true: 'catalog.participation.mine',
  false: 'catalog.participation.others',
}

export const CATALOG_LAYOUTS = ['table', 'grid'] as const
export type CatalogLayout = (typeof CATALOG_LAYOUTS)[number]

export function resolveLayout(value: string): CatalogLayout {
  return value === 'grid' ? 'grid' : 'table'
}

export function effectiveLayout(value: CatalogLayout, phone: boolean): CatalogLayout {
  return phone ? 'grid' : value
}

export const CATALOG_SORTS = [
  'start_at',
  'end_at',
  'duration',
  'title',
  'prize',
  'team_min',
  'team_max',
] as const
export type CatalogSort = (typeof CATALOG_SORTS)[number]

export const CATALOG_ORDERS = ['asc', 'desc'] as const
export type CatalogOrder = (typeof CATALOG_ORDERS)[number]

export const DEFAULT_CATALOG_SORT: CatalogSort = 'start_at'
export const DEFAULT_CATALOG_ORDER: CatalogOrder = 'asc'

export function resolveSort(value: string): CatalogSort {
  return CATALOG_SORTS.includes(value as CatalogSort)
    ? (value as CatalogSort)
    : DEFAULT_CATALOG_SORT
}

export function resolveOrder(value: string): CatalogOrder {
  return CATALOG_ORDERS.includes(value as CatalogOrder)
    ? (value as CatalogOrder)
    : DEFAULT_CATALOG_ORDER
}

export const CATALOG_COLUMNS = [
  'title',
  'kind',
  'format',
  'place',
  'start',
  'end',
  'duration',
  'prize',
  'organizer',
  'track',
  'teamMin',
  'teamMax',
  'origin',
  'state',
  'participation',
] as const
export type CatalogColumn = (typeof CATALOG_COLUMNS)[number]

export const CATALOG_COLUMN_KEY: Record<CatalogColumn, string> = {
  title: 'catalog.column.title',
  kind: 'catalog.column.kind',
  format: 'catalog.column.format',
  place: 'catalog.column.place',
  start: 'catalog.column.start',
  end: 'catalog.column.end',
  duration: 'catalog.column.duration',
  prize: 'catalog.column.prize',
  organizer: 'catalog.column.organizer',
  track: 'catalog.column.track',
  teamMin: 'catalog.column.teamMin',
  teamMax: 'catalog.column.teamMax',
  origin: 'catalog.column.origin',
  state: 'catalog.column.state',
  participation: 'catalog.column.participation',
}

export const ADMIN_COLUMNS = [
  'title',
  'kind',
  'format',
  'place',
  'start',
  'end',
  'duration',
  'prize',
  'organizer',
  'track',
  'teamMin',
  'teamMax',
  'origin',
  'state',
  'created',
  'updated',
  'published',
  'cover',
] as const
export type AdminColumn = (typeof ADMIN_COLUMNS)[number]

export const ADMIN_COLUMN_KEY: Record<AdminColumn, string> = {
  title: 'catalog.column.title',
  kind: 'catalog.column.kind',
  format: 'catalog.column.format',
  place: 'catalog.column.place',
  start: 'catalog.column.start',
  end: 'catalog.column.end',
  duration: 'catalog.column.duration',
  prize: 'catalog.column.prize',
  organizer: 'catalog.column.organizer',
  track: 'catalog.column.track',
  teamMin: 'catalog.column.teamMin',
  teamMax: 'catalog.column.teamMax',
  origin: 'catalog.column.origin',
  state: 'catalog.column.state',
  created: 'catalog.column.created',
  updated: 'catalog.column.updated',
  published: 'catalog.column.published',
  cover: 'catalog.column.cover',
}

export const DEFAULT_ADMIN_COLUMNS: AdminColumn[] = [
  'title',
  'organizer',
  'start',
  'end',
  'duration',
  'state',
  'updated',
]

const RETIRED_COLUMNS: Record<string, readonly string[]> = {
  period: ['start', 'end', 'duration'],
  teamSize: ['teamMin', 'teamMax'],
}

function unfoldRetired(value: unknown[]): unknown[] {
  return value.flatMap((column) =>
    typeof column === 'string' && column in RETIRED_COLUMNS
      ? [...(RETIRED_COLUMNS[column] ?? [])]
      : [column],
  )
}

export function resolveAdminColumns(value: unknown): AdminColumn[] {
  if (!Array.isArray(value)) return DEFAULT_ADMIN_COLUMNS
  const saved = unfoldRetired(value)
  const picked = ADMIN_COLUMNS.filter((column) => saved.includes(column))
  if (picked.length === 0) return DEFAULT_ADMIN_COLUMNS
  return picked.includes('title') ? picked : ['title', ...picked]
}

export const CATALOG_LOCKED_COLUMN: CatalogColumn = 'title'

export const DEFAULT_CATALOG_COLUMNS: CatalogColumn[] = [
  'title',
  'format',
  'place',
  'start',
  'end',
  'duration',
  'prize',
  'state',
]

export function resolveColumns(value: unknown): CatalogColumn[] {
  if (!Array.isArray(value)) return DEFAULT_CATALOG_COLUMNS
  const saved = unfoldRetired(value)
  const picked = CATALOG_COLUMNS.filter((column) => saved.includes(column))
  if (picked.length === 0) return DEFAULT_CATALOG_COLUMNS
  return picked.includes(CATALOG_LOCKED_COLUMN) ? picked : [CATALOG_LOCKED_COLUMN, ...picked]
}
