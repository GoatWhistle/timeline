import { PanelLeft, Shield, User } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { NavLink, useLocation } from 'react-router'
import { listName } from '@/entities/user/person-name/person-name'
import { EventFeedBell } from '@/features/event-feed-bell/event-feed-bell'
import { ProfileMenu } from '@/features/profile-menu/profile-menu'
import type { MeResponse } from '@/shared/api/types.gen'
import { useLocale } from '@/shared/i18n/i18n-context'
import { cn } from '@/shared/styling/class-names/class-names'
import { Wordmark } from '@/shared/ui/brand/wordmark'
import type { SidebarState } from '@/shared/ui/layout/sidebar/use-sidebar'
import { ADMIN_NAV, NavSection, USER_NAV } from './nav-section'

export function AppSidebar({
  user,
  isAdmin,
  sidebar,
}: {
  user: MeResponse | undefined
  isAdmin: boolean
  sidebar: SidebarState
}) {
  const { t } = useTranslation()
  const { locale } = useLocale()
  const location = useLocation()

  const displayedName = user
    ? listName(
        { first_name: user.first_name, middle_name: user.middle_name, last_name: user.last_name },
        locale,
      )
    : ''

  const inAdmin = location.pathname.startsWith('/admin')

  return (
    <aside
      data-sidebar={sidebar.visibility}
      aria-hidden={sidebar.collapsed}
      inert={sidebar.collapsed ? true : undefined}
      className={cn(
        'flex w-sidebar shrink-0 flex-col justify-between overflow-y-auto border-border border-r bg-card p-2',
        'motion-safe:transition-[margin,translate] motion-safe:duration-base motion-safe:ease-out',
        'motion-safe:will-change-transform',
        sidebar.collapsed
          ? 'pointer-events-none -mr-sidebar translate-x-[calc(var(--pane-sidebar)*-1)]'
          : 'mr-0 translate-x-0',
      )}
    >
      <nav aria-label={t('app.mainNav')} className="flex flex-col gap-3">
        <div className="mb-3 flex items-center gap-2 px-3 py-2">
          <Wordmark to="/schedule" className="min-w-0 flex-1" />
          <button
            type="button"
            onClick={sidebar.toggle}
            aria-label={t('app.collapseSidebar')}
            aria-expanded={!sidebar.collapsed}
            data-sidebar-toggle
            className={cn(
              'flex size-6 shrink-0 items-center justify-center rounded-control text-muted-foreground',
              'transition-colors duration-instant hover:bg-surface-2 hover:text-foreground',
              'focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring',
            )}
          >
            <PanelLeft className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div
          key={inAdmin ? 'admin' : 'user'}
          className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-left-2 motion-safe:duration-base motion-safe:ease-out"
        >
          <NavSection items={inAdmin ? ADMIN_NAV : USER_NAV} />
        </div>
      </nav>

      <div className="mt-6 flex flex-col gap-6 px-1 pb-2">
        {isAdmin && (
          <NavLink
            to={inAdmin ? '/' : '/admin/events'}
            className={cn(
              'flex h-row items-center gap-2 rounded-control px-2 text-copy',
              'text-muted-foreground transition-colors duration-instant',
              'hover:bg-surface-2 hover:text-foreground',
              'focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring',
            )}
          >
            {inAdmin ? (
              <User className="size-4 shrink-0" aria-hidden="true" />
            ) : (
              <Shield className="size-4 shrink-0" aria-hidden="true" />
            )}
            <span className="truncate">{t(inAdmin ? 'nav.userPanel' : 'nav.adminPanel')}</span>
          </NavLink>
        )}
        <div className="border-border border-t pt-4">
          {user && (
            <div className="flex items-center gap-1">
              <div className="min-w-0 flex-1">
                <ProfileMenu
                  userId={user.id}
                  displayName={displayedName}
                  firstName={user.first_name}
                  lastName={user.last_name}
                  email={user.email}
                  avatarUrl={user.avatar_url}
                />
              </div>
              <EventFeedBell />
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
