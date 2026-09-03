const PAGE_KEY: [string, string][] = [
  ['/admin/events', 'nav.adminEvents'],
  ['/admin/schedule', 'nav.adminSchedule'],
  ['/admin/deadlines', 'nav.adminDeadlines'],
  ['/admin/users', 'nav.adminUsers'],
  ['/admin/invites', 'nav.adminInvites'],
  ['/admin/audit', 'nav.adminAudit'],
  ['/admin/ops', 'nav.adminOps'],
  ['/catalog', 'nav.catalog'],
  ['/events', 'nav.myEvents'],
  ['/schedule', 'nav.schedule'],
  ['/teams', 'nav.teams'],
  ['/history', 'nav.history'],
  ['/settings', 'nav.settings'],
]

export function pageNameKey(pathname: string): string | null {
  for (const [prefix, key] of PAGE_KEY) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return key
  }
  return null
}
