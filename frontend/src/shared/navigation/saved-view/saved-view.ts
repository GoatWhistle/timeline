export type SavedView = {
  id: string
  titleKey: string
  params: Record<string, string>
}

export function viewSearch(view: SavedView): string {
  const params = new URLSearchParams(view.params)
  const search = params.toString()
  return search ? `?${search}` : ''
}

const DEFAULT_VIEW_KEYS = ['state', 'sort', 'archived'] as const

export function isViewActive(
  view: SavedView,
  search: string,
  keys: readonly string[] = DEFAULT_VIEW_KEYS,
): boolean {
  const current = new URLSearchParams(search)

  for (const key of keys) {
    const expected = view.params[key] ?? null
    const actual = current.get(key)
    if (expected !== actual) return false
  }
  return true
}

export function activeView(
  views: SavedView[],
  search: string,
  keys?: readonly string[],
): SavedView | null {
  return views.find((view) => isViewActive(view, search, keys)) ?? null
}
