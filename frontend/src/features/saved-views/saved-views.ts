export type SavedView = {
  id: string
  titleKey: string
  params: Record<string, string>
}

export const EVENT_VIEWS: SavedView[] = [
  { id: 'all', titleKey: 'views.all', params: {} },
  { id: 'upcoming', titleKey: 'views.upcoming', params: { state: 'UPCOMING' } },
  { id: 'active', titleKey: 'views.active', params: { state: 'ACTIVE' } },
  { id: 'deadlines', titleKey: 'views.deadlines', params: { sort: 'deadline' } },
  { id: 'archived', titleKey: 'views.archived', params: { archived: '1' } },
]

export function viewSearch(view: SavedView): string {
  const params = new URLSearchParams(view.params)
  const search = params.toString()
  return search ? `?${search}` : ''
}

export function isViewActive(view: SavedView, search: string): boolean {
  const current = new URLSearchParams(search)
  const keys = ['state', 'sort', 'archived']

  for (const key of keys) {
    const expected = view.params[key] ?? null
    const actual = current.get(key)
    if (expected !== actual) return false
  }
  return true
}

export function activeView(views: SavedView[], search: string): SavedView | null {
  return views.find((view) => isViewActive(view, search)) ?? null
}
