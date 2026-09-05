import { useQuery } from '@tanstack/react-query'
import { Suspense, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Outlet, useLocation } from 'react-router'
import { unreadCountQueryOptions } from '@/entities/event-feed/event-feed.queries'
import { useShortcutBindings } from '@/entities/user/shortcuts.queries'
import { AppShortcuts } from '@/features/app-shortcuts/app-shortcuts'
import { VerificationBanner } from '@/features/auth/verification-banner/verification-banner'
import { ConnectionBanner } from '@/features/connection-banner/connection-banner'
import { SettingsOverlay } from '@/features/settings-overlay/settings-overlay'
import { useSession } from '@/shared/api/session'
import { useProfileTimezone } from '@/shared/datetime/use-profile-timezone'
import { useProfileShortcuts } from '@/shared/keyboard/shortcut-bindings'
import { GOTO_ADMIN, GOTO_USER } from '@/shared/keyboard/shortcut-catalog'
import { cn } from '@/shared/styling/class-names/class-names'
import { BAR_INSET_BOTTOM } from '@/shared/ui/layout/mobile/mobile-state'
import { usePhoneViewport } from '@/shared/ui/layout/mobile/use-phone-viewport'
import { useSidebar } from '@/shared/ui/layout/sidebar/use-sidebar'
import { SCRIM_FILL } from '@/shared/ui/overlays/overlay-chrome'
import { RouteFallback } from './route-fallback'
import { AppSidebar } from './sidebar/app-sidebar'
import { BottomNav } from './sidebar/bottom-nav'
import { MobileTopBar } from './sidebar/mobile-top-bar'
import { CATALOG_NAV, MINE_NAV } from './sidebar/nav-section'
import { PhoneMoreSheet } from './sidebar/phone-more-sheet'
import { useProfileLocale } from './use-profile-locale'

const PHONE_NAV = [...CATALOG_NAV, ...MINE_NAV]

export function AppShell() {
  const { user, isAdmin } = useSession()
  const { t } = useTranslation()
  const sidebar = useSidebar()
  const phone = usePhoneViewport()
  const location = useLocation()
  const [moreOpen, setMoreOpen] = useState(false)
  const unread = useQuery({ ...unreadCountQueryOptions, enabled: user !== undefined })
  useProfileLocale()
  useProfileTimezone()
  useProfileShortcuts(useShortcutBindings())

  const drawerScrim = !phone && sidebar.overlay && !sidebar.collapsed

  return (
    <div className="relative flex h-screen overflow-hidden">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-control focus:border focus:border-border-strong focus:bg-popover focus:px-3 focus:py-2 focus:text-copy focus:text-popover-foreground"
      >
        {t('app.skipToContent')}
      </a>

      <AppShortcuts targets={isAdmin ? [...GOTO_USER, ...GOTO_ADMIN] : GOTO_USER} />

      {!phone && <AppSidebar user={user} isAdmin={isAdmin} sidebar={sidebar} />}

      {drawerScrim && (
        <button
          type="button"
          tabIndex={-1}
          aria-hidden="true"
          data-sidebar-scrim
          onClick={sidebar.close}
          className={cn(
            'fixed inset-0 z-40',
            SCRIM_FILL,
            'motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-base motion-safe:ease-out',
          )}
        />
      )}

      <main
        id="main"
        className={cn(
          'flex min-w-0 flex-1 flex-col overflow-hidden',
          phone ? BAR_INSET_BOTTOM : 'pl-2',
        )}
      >
        {(phone || sidebar.overlay) && (
          <MobileTopBar
            showBell={user !== undefined}
            onOpenNav={phone ? undefined : sidebar.toggle}
            navExpanded={!sidebar.collapsed}
          />
        )}
        <VerificationBanner />
        <ConnectionBanner />
        <Suspense fallback={<RouteFallback />}>
          <Outlet />
        </Suspense>
      </main>

      {phone && (
        <>
          <BottomNav
            items={PHONE_NAV}
            user={user}
            unread={unread.data?.unread ?? 0}
            onOpenMore={() => setMoreOpen(true)}
            moreExpanded={moreOpen}
          />
          <PhoneMoreSheet
            user={user}
            isAdmin={isAdmin}
            inAdmin={isAdmin && location.pathname.startsWith('/admin')}
            open={moreOpen}
            onOpenChange={setMoreOpen}
          />
        </>
      )}

      <SettingsOverlay />
    </div>
  )
}
