import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ADMIN_NAV, CATALOG_NAV, MINE_NAV, type NavItem } from '@/app/sidebar/nav-section'
import { LOCALES } from '@/shared/i18n/locale'

type Page = {
  to: string
  source: string
  titleKey: string
  bundle: string
  path: string
}

const PAGES: Page[] = [
  {
    to: '/catalog',
    source: 'features/catalog/catalog-toolbar.tsx',
    titleKey: 'catalog.title',
    bundle: 'event-list',
    path: 'catalog.title',
  },
  {
    to: '/schedule',
    source: 'features/schedule/my/schedule.tsx',
    titleKey: 'schedule.myTitle',
    bundle: 'schedule',
    path: 'schedule.myTitle',
  },
  {
    to: '/teams',
    source: 'features/teams/teams.tsx',
    titleKey: 'title',
    bundle: 'team',
    path: 'title',
  },
  {
    to: '/history',
    source: 'features/personal-history/history.tsx',
    titleKey: 'personal.history.title',
    bundle: 'event-personal',
    path: 'personal.history.title',
  },
  {
    to: '/admin/events',
    source: 'features/event-list/admin/event-list.tsx',
    titleKey: 'list.adminTitle',
    bundle: 'event-list',
    path: 'list.adminTitle',
  },
  {
    to: '/admin/deadlines',
    source: 'features/deadline-list/deadline-list.tsx',
    titleKey: 'deadlines.title',
    bundle: 'event-schedule',
    path: 'deadlines.title',
  },
  {
    to: '/admin/users',
    source: 'features/user-list/user-list.tsx',
    titleKey: 'users.title',
    bundle: 'admin',
    path: 'users.title',
  },
  {
    to: '/admin/invites',
    source: 'features/invite-list/invite-list.tsx',
    titleKey: 'invites.title',
    bundle: 'admin',
    path: 'invites.title',
  },
  {
    to: '/admin/audit',
    source: 'features/audit-log/audit-log.tsx',
    titleKey: 'audit.title',
    bundle: 'admin',
    path: 'audit.title',
  },
  {
    to: '/admin/ops',
    source: 'features/ops-queue/ops-queue.tsx',
    titleKey: 'ops:title',
    bundle: 'ops',
    path: 'title',
  },
]

const NAV: NavItem[] = [...CATALOG_NAV, ...MINE_NAV, ...ADMIN_NAV]

const SRC = join(process.cwd(), 'src')

function dictionary(locale: string, bundle: string): unknown {
  return JSON.parse(readFileSync(join(SRC, `shared/i18n/locales/${locale}/${bundle}.json`), 'utf8'))
}

function at(tree: unknown, path: string): string | undefined {
  const found = path
    .split('.')
    .reduce<unknown>(
      (node, key) =>
        node && typeof node === 'object' ? (node as Record<string, unknown>)[key] : undefined,
      tree,
    )
  return typeof found === 'string' ? found : undefined
}

function navLabel(locale: string, labelKey: string): string | undefined {
  return at(dictionary(locale, 'shell'), labelKey)
}

const byRoute = new Map(PAGES.map((page) => [page.to, page]))

describe('every menu entry is answered by a page that carries the same name', () => {
  it('covers each menu entry exactly once, so a new page cannot slip past unnamed', () => {
    expect([...byRoute.keys()].sort()).toEqual(NAV.map((item) => item.to).sort())
    expect(PAGES).toHaveLength(NAV.length)
  })

  it.each(NAV)('the page behind $to reads its title from the key this check names', ({ to }) => {
    const page = byRoute.get(to)
    if (!page) throw new Error(`no page recorded for ${to}`)

    const source = readFileSync(join(SRC, page.source), 'utf8')
    expect(source, page.source).toContain(`t('${page.titleKey}')`)
  })

  it.each(LOCALES.flatMap((locale) => NAV.map((item) => ({ locale, item }))))(
    'the $item.to heading equals its menu label in $locale',
    ({ locale, item }) => {
      const page = byRoute.get(item.to)
      if (!page) throw new Error(`no page recorded for ${item.to}`)

      const label = navLabel(locale, item.labelKey)
      const title = at(dictionary(locale, page.bundle), page.path)

      expect(label, `${locale} ${item.labelKey}`).toBeTruthy()
      expect(title, `${locale} ${page.bundle}:${page.path}`).toBeTruthy()
      expect(title, `${item.to} in ${locale}`).toBe(label)
    },
  )

  it('names the page in every language the app ships, not only the active one', () => {
    expect(LOCALES.length).toBeGreaterThan(1)
    for (const locale of LOCALES) {
      for (const item of NAV) expect(navLabel(locale, item.labelKey), locale).toBeTruthy()
    }
  })
})
