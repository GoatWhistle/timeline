import type { ShortcutGroup } from '../shortcut-registry'

export type CatalogEntry = {
  id: string
  keys: string[]
  titleKey: string
  group: ShortcutGroup
}

export type CatalogSection = {
  id: string
  titleKey: string
  shortcuts: CatalogEntry[]
}

export type GotoTarget = { id: string; path: string; titleKey: string; key: string }

export const GOTO_USER: GotoTarget[] = [
  { id: 'catalog', path: '/catalog', key: 'c', titleKey: 'nav.catalog' },
  { id: 'events', path: '/catalog?joined=true', key: 'e', titleKey: 'nav.myEvents' },
  { id: 'schedule', path: '/schedule', key: 's', titleKey: 'nav.schedule' },
  { id: 'teams', path: '/teams', key: 't', titleKey: 'nav.teams' },
  { id: 'history', path: '/history', key: 'h', titleKey: 'nav.history' },
]

export const GOTO_ADMIN: GotoTarget[] = [
  { id: 'admin-events', path: '/admin/events', key: 'a', titleKey: 'nav.adminEvents' },
  { id: 'admin-users', path: '/admin/users', key: 'u', titleKey: 'nav.adminUsers' },
  { id: 'admin-audit', path: '/admin/audit', key: 'l', titleKey: 'nav.adminAudit' },
  { id: 'admin-retention', path: '/admin/retention', key: 'r', titleKey: 'nav.adminRetention' },
]

function gotoEntry(target: GotoTarget): CatalogEntry {
  return {
    id: `goto-${target.id}`,
    keys: [`g ${target.key}`],
    titleKey: target.titleKey,
    group: 'navigation',
  }
}

const APPLICATION: CatalogEntry[] = [
  { id: 'command-palette', keys: ['mod+k'], titleKey: 'shortcuts.palette', group: 'global' },
  { id: 'shortcut-help', keys: ['?', 'mod+/'], titleKey: 'shortcuts.help', group: 'global' },
  { id: 'sidebar-toggle', keys: ['mod+b'], titleKey: 'shortcuts.sidebar', group: 'global' },
]

const LISTS: CatalogEntry[] = [
  { id: 'list-next', keys: ['j', 'arrowdown'], titleKey: 'shortcuts.listNext', group: 'list' },
  {
    id: 'list-previous',
    keys: ['k', 'arrowup'],
    titleKey: 'shortcuts.listPrevious',
    group: 'list',
  },
  { id: 'list-clear', keys: ['escape'], titleKey: 'shortcuts.listClear', group: 'list' },
  { id: 'list-select', keys: ['x'], titleKey: 'shortcuts.listSelect', group: 'list' },
  { id: 'focus-search', keys: ['/'], titleKey: 'shortcuts.search', group: 'list' },
]

function navigationFor(isAdmin: boolean): CatalogEntry[] {
  return (isAdmin ? [...GOTO_USER, ...GOTO_ADMIN] : GOTO_USER).map(gotoEntry)
}

export function catalogFor(isAdmin: boolean): CatalogSection[] {
  return [
    { id: 'app', titleKey: 'shortcuts.scopeApp', shortcuts: APPLICATION },
    { id: 'navigation', titleKey: 'shortcuts.scopeNavigation', shortcuts: navigationFor(isAdmin) },
    { id: 'list', titleKey: 'shortcuts.scopeLists', shortcuts: LISTS },
  ]
}

export const CATALOG: CatalogSection[] = catalogFor(true)

const BY_ID = new Map<string, CatalogEntry>(
  CATALOG.flatMap((section) => section.shortcuts).map((entry) => [entry.id, entry]),
)

export function catalogEntry(id: string): CatalogEntry {
  const entry = BY_ID.get(id)
  if (!entry) throw new Error(`shortcut ${id} is not in the catalogue`)
  return entry
}

export function catalogKeys(id: string): string[] {
  return catalogEntry(id).keys
}

export function catalogTitleKey(id: string): string {
  return catalogEntry(id).titleKey
}
