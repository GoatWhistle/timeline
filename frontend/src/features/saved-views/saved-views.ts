import type { SavedView } from '@/shared/navigation/saved-view'

export const EVENT_VIEWS: SavedView[] = [
  { id: 'all', titleKey: 'views.all', params: {} },
  { id: 'upcoming', titleKey: 'views.upcoming', params: { state: 'UPCOMING' } },
  { id: 'active', titleKey: 'views.active', params: { state: 'ACTIVE' } },
  { id: 'deadlines', titleKey: 'views.deadlines', params: { sort: 'deadline' } },
  { id: 'archived', titleKey: 'views.archived', params: { archived: '1' } },
]
