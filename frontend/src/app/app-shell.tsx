import {
  AlarmClock,
  CalendarRange,
  ClipboardList,
  LayoutList,
  ScrollText,
  Send,
  UserCog,
  Users,
} from 'lucide-react'
import type * as React from 'react'
import { Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, Outlet, useLocation } from 'react-router'
import { AppShortcuts, type GotoTarget } from '@/features/app-shortcuts/app-shortcuts'
import { VerificationBanner } from '@/features/auth/verification-banner/verification-banner'
import { ProfileMenu } from '@/features/profile-menu/profile-menu'
import { EVENT_VIEWS } from '@/features/saved-views/saved-views'
import { SavedViewsNav } from '@/features/saved-views/saved-views-nav'
import { useSession } from '@/shared/api/session'
import { useProfileLocale } from '@/shared/i18n/use-profile-locale'
import { cn } from '@/shared/styling/class-names/class-names'
import { RouteFallback } from './route-fallback'

type NavItem = {
  to: string
  labelKey: string
  icon: React.ComponentType<{ className?: string }>
}

const USER_NAV: NavItem[] = [
  { to: '/', labelKey: 'nav.myEvents', icon: LayoutList },
  { to: '/schedule', labelKey: 'nav.schedule', icon: CalendarRange },
  { to: '/profile', labelKey: 'nav.profile', icon: UserCog },
]

const ADMIN_NAV: NavItem[] = [
  { to: '/admin/events', labelKey: 'nav.adminEvents', icon: ClipboardList },
  { to: '/admin/schedule', labelKey: 'nav.adminSchedule', icon: CalendarRange },
  { to: '/admin/deadlines', labelKey: 'nav.adminDeadlines', icon: AlarmClock },
  { to: '/admin/users', labelKey: 'nav.adminUsers', icon: Users },
  { to: '/admin/invites', labelKey: 'nav.adminInvites', icon: Send },
  { to: '/admin/audit', labelKey: 'nav.adminAudit', icon: ScrollText },
]

const USER_TARGETS: GotoTarget[] = [
  { id: 'events', path: '/', key: 'e', titleKey: 'nav.myEvents' },
  { id: 'schedule', path: '/schedule', key: 's', titleKey: 'nav.schedule' },
  { id: 'profile', path: '/profile', key: 'p', titleKey: 'nav.profile' },
]

const ADMIN_TARGETS: GotoTarget[] = [
  { id: 'admin-events', path: '/admin/events', key: 'a', titleKey: 'nav.adminEvents' },
  { id: 'admin-users', path: '/admin/users', key: 'u', titleKey: 'nav.adminUsers' },
  { id: 'admin-audit', path: '/admin/audit', key: 'l', titleKey: 'nav.adminAudit' },
]

function NavSection({ title, items }: { title: string; items: NavItem[] }) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-0.5">
      <p className="px-3 py-1.5 font-medium text-caption text-muted-foreground uppercase tracking-wide">
        {title}
      </p>
      {items.map(({ to, labelKey, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            cn(
              'flex h-row items-center gap-2 rounded-[6px] px-3 text-copy transition-colors duration-instant',
              'focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring',
              isActive
                ? 'bg-accent-surface font-medium text-accent-surface-foreground'
                : 'text-muted-foreground hover:bg-surface-3 hover:text-foreground',
            )
          }
        >
          <Icon className="size-4 shrink-0" aria-hidden="true" />
          {t(labelKey)}
        </NavLink>
      ))}
    </div>
  )
}

export function AppShell() {
  const { user, isAdmin } = useSession()
  const { t } = useTranslation()
  const location = useLocation()
  useProfileLocale()

  const listPath = location.pathname.startsWith('/admin/events') ? '/admin/events' : '/'
  const showViews = location.pathname === '/' || location.pathname === '/admin/events'

  return (
    <div className="flex h-screen overflow-hidden">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2"
      >
        {t('app.skipToContent')}
      </a>

      <AppShortcuts targets={isAdmin ? [...USER_TARGETS, ...ADMIN_TARGETS] : USER_TARGETS} />

      <aside className="flex w-sidebar shrink-0 flex-col justify-between overflow-y-auto border-border border-r bg-card p-2">
        <nav aria-label={t('app.mainNav')} className="flex flex-col gap-3">
          <div className="px-3 py-2">
            <p className="font-semibold text-heading">{t('app.name')}</p>
          </div>
          <NavSection title={t('app.sectionParticipant')} items={USER_NAV} />
          {showViews && <SavedViewsNav views={EVENT_VIEWS} basePath={listPath} />}
          {isAdmin && <NavSection title={t('app.sectionAdmin')} items={ADMIN_NAV} />}
        </nav>

        <div className="mt-4 border-border border-t px-1 pt-3 pb-1">
          {user && (
            <ProfileMenu userId={user.id} displayName={user.display_name} email={user.email} />
          )}
        </div>
      </aside>

      <main id="main" className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <VerificationBanner />
        <Suspense fallback={<RouteFallback />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  )
}
