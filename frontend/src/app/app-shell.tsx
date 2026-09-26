import { useQuery } from '@tanstack/react-query'
import { PanelLeft } from 'lucide-react'
import { Suspense, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Outlet, useLocation } from 'react-router'
import { inboxUnreadCountQueryOptions } from '@/entities/inbox/inbox.queries'
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
import { useFollowSidebar } from './sidebar/use-follow-sidebar'
import { useProfileLocale } from './use-profile-locale'

const PHONE_NAV = [...CATALOG_NAV, ...MINE_NAV]

export function AppShell() {
  const { user, isAdmin } = useSession()
  const { t } = useTranslation()
  const sidebar = useSidebar()
  const phone = usePhoneViewport()
  const location = useLocation()
  const [moreOpen, setMoreOpen] = useState(false)
  const mainRef = useRef<HTMLElement>(null)
  const unread = useQuery({ ...inboxUnreadCountQueryOptions, enabled: user !== undefined })
  useProfileLocale()
  useProfileTimezone()
  useProfileShortcuts(useShortcutBindings())

  useEffect(() => {
    function focusMain() {
      mainRef.current?.focus()
    }
    function onClick(event: MouseEvent) {
      const target = event.target
      if (target instanceof Element && target.closest('a[href="#main"]')) focusMain()
    }
    function onHashChange() {
      if (window.location.hash === '#main') focusMain()
    }
    document.addEventListener('click', onClick)
    window.addEventListener('hashchange', onHashChange)
    return () => {
      document.removeEventListener('click', onClick)
      window.removeEventListener('hashchange', onHashChange)
    }
  }, [])

  const drawerScrim = !phone && sidebar.overlay && !sidebar.collapsed
  useFollowSidebar(mainRef, sidebar.collapsed)

  return (
    <div className="relative flex h-screen overflow-hidden">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-control focus:border focus:border-border-strong focus:bg-popover focus:px-3 focus:py-2 focus:text-copy focus:text-popover-foreground"
      >
        {t('app.skipToContent')}
      </a>

      <AppShortcuts
        targets={isAdmin ? [...GOTO_USER, ...GOTO_ADMIN] : GOTO_USER}
        isAdmin={isAdmin}
      />

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
        ref={mainRef}
        tabIndex={-1}
        className={cn(
          'relative flex min-w-0 flex-1 flex-col overflow-hidden outline-none',
          phone ? BAR_INSET_BOTTOM : 'pl-2',
          !phone && !sidebar.overlay && sidebar.collapsed && 'pl-14',
        )}
      >
        {(phone || sidebar.overlay) && (
          <MobileTopBar
            showBell={user !== undefined}
            onOpenNav={phone ? undefined : sidebar.toggle}
            navExpanded={!sidebar.collapsed}
          />
        )}
        {!phone && !sidebar.overlay && sidebar.collapsed && (
          <button
            type="button"
            onClick={sidebar.toggle}
            aria-label={t('app.expandSidebar')}
            aria-expanded={false}
            aria-controls="app-sidebar"
            data-sidebar-toggle
            className={cn(
              'absolute top-4 left-2 z-30 flex size-9 items-center justify-center',
              'rounded-control border border-border bg-surface-1 text-muted-foreground',
              'transition-colors duration-instant hover:bg-surface-2 hover:text-foreground',
              'focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring',
            )}
          >
            <PanelLeft className="size-4" aria-hidden="true" />
          </button>
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
