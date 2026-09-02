import { PanelLeftDashed } from 'lucide-react'
import { Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { Outlet } from 'react-router'
import { useShortcutBindings } from '@/entities/user/shortcuts.queries'
import { AppShortcuts, type GotoTarget } from '@/features/app-shortcuts/app-shortcuts'
import { VerificationBanner } from '@/features/auth/verification-banner/verification-banner'
import { ConnectionBanner } from '@/features/connection-banner/connection-banner'
import { SettingsOverlay } from '@/features/settings-overlay/settings-overlay'
import { useSession } from '@/shared/api/session'
import { useProfileTimezone } from '@/shared/datetime/use-profile-timezone'
import { useProfileShortcuts } from '@/shared/keyboard/shortcut-bindings'
import { cn } from '@/shared/styling/class-names/class-names'
import { useSidebar } from '@/shared/ui/layout/sidebar/use-sidebar'
import { RouteFallback } from './route-fallback'
import { AppSidebar } from './sidebar/app-sidebar'
import { useProfileLocale } from './use-profile-locale'

const USER_TARGETS: GotoTarget[] = [
  { id: 'catalog', path: '/catalog', key: 'c', titleKey: 'nav.catalog' },
  { id: 'events', path: '/', key: 'e', titleKey: 'nav.myEvents' },
  { id: 'schedule', path: '/schedule', key: 's', titleKey: 'nav.schedule' },
]

const ADMIN_TARGETS: GotoTarget[] = [
  { id: 'admin-events', path: '/admin/events', key: 'a', titleKey: 'nav.adminEvents' },
  { id: 'admin-users', path: '/admin/users', key: 'u', titleKey: 'nav.adminUsers' },
  { id: 'admin-audit', path: '/admin/audit', key: 'l', titleKey: 'nav.adminAudit' },
]

export function AppShell() {
  const { user, isAdmin } = useSession()
  const { t } = useTranslation()
  const sidebar = useSidebar()
  useProfileLocale()
  useProfileTimezone()
  useProfileShortcuts(useShortcutBindings())

  return (
    <div className="relative flex h-screen overflow-hidden">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-control focus:border focus:border-border-strong focus:bg-popover focus:px-3 focus:py-2 focus:text-copy focus:text-popover-foreground"
      >
        {t('app.skipToContent')}
      </a>

      <AppShortcuts targets={isAdmin ? [...USER_TARGETS, ...ADMIN_TARGETS] : USER_TARGETS} />

      <AppSidebar user={user} isAdmin={isAdmin} sidebar={sidebar} />

      <main
        id="main"
        className={cn(
          'flex min-w-0 flex-1 flex-col overflow-hidden',
          sidebar.collapsed ? 'pl-10' : 'pl-2',
        )}
      >
        <VerificationBanner />
        <ConnectionBanner />
        {sidebar.collapsed && (
          <button
            type="button"
            onClick={sidebar.toggle}
            aria-label={t('app.expandSidebar')}
            aria-expanded={false}
            data-sidebar-toggle
            className={cn(
              'absolute top-2 left-2 z-30 flex size-7 items-center justify-center rounded-control',
              'border border-border bg-card text-muted-foreground shadow-sm',
              'transition-colors duration-instant hover:bg-surface-2 hover:text-foreground',
              'focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring',
            )}
          >
            <PanelLeftDashed className="size-4" aria-hidden="true" />
          </button>
        )}
        <Suspense fallback={<RouteFallback />}>
          <Outlet />
        </Suspense>
      </main>

      <SettingsOverlay />
    </div>
  )
}
