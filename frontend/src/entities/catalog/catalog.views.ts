import type { SavedView } from '@/features/saved-views/saved-views'

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

export const CATALOG_LAYOUTS = ['list', 'grid'] as const
export type CatalogLayout = (typeof CATALOG_LAYOUTS)[number]

export function resolveLayout(value: string): CatalogLayout {
  return value === 'grid' ? 'grid' : 'list'
}

export const CATALOG_VIEW_KEYS = ['state', 'format', 'kind'] as const

export const CATALOG_VIEWS: SavedView[] = [
  { id: 'catalog-all', titleKey: 'catalog.views.all', params: {} },
  { id: 'catalog-upcoming', titleKey: 'catalog.views.upcoming', params: { state: 'UPCOMING' } },
  { id: 'catalog-active', titleKey: 'catalog.views.active', params: { state: 'ACTIVE' } },
  { id: 'catalog-offline', titleKey: 'catalog.views.offline', params: { format: 'OFFLINE' } },
  { id: 'catalog-meetups', titleKey: 'catalog.views.meetups', params: { kind: 'MEETUP' } },
]
