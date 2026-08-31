import { PanelLeftClose } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router'
import { CATALOG_VIEW_KEYS, CATALOG_VIEWS } from '@/entities/catalog/catalog.views'
import { listName } from '@/entities/user/person-name/person-name'
import { EventFeedBell } from '@/features/event-feed-bell/event-feed-bell'
import { ProfileMenu } from '@/features/profile-menu/profile-menu'
import { EVENT_VIEWS } from '@/features/saved-views/saved-views'
import { SavedViewsNav } from '@/features/saved-views/saved-views-nav'
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

  const onCatalog = location.pathname === '/catalog'
  const listPath = location.pathname.startsWith('/admin/events') ? '/admin/events' : '/events'
  const showViews = location.pathname === '/events' || location.pathname === '/admin/events'

  return (
    <aside
      data-sidebar={sidebar.visibility}
      hidden={sidebar.visibility === 'hidden'}
      onPointerLeave={() => sidebar.setPeeking(false)}
      className={cn(
        'flex w-sidebar shrink-0 flex-col justify-between overflow-y-auto border-border border-r bg-card p-2',
        sidebar.visibility === 'peeking' &&
          'absolute inset-y-0 left-0 z-40 shadow-lg motion-safe:animate-in motion-safe:slide-in-from-left-2 motion-safe:duration-panel motion-safe:ease-out',
      )}
    >
      <nav aria-label={t('app.mainNav')} className="flex flex-col gap-3">
        <div className="flex items-center gap-2 px-3 py-2">
          <Wordmark className="min-w-0 flex-1" />
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
            <PanelLeftClose className="size-4" aria-hidden="true" />
          </button>
        </div>

        <NavSection title={t('app.sectionParticipant')} items={USER_NAV} />
        {showViews && <SavedViewsNav views={EVENT_VIEWS} basePath={listPath} />}
        {onCatalog && (
          <SavedViewsNav views={CATALOG_VIEWS} basePath="/catalog" keys={CATALOG_VIEW_KEYS} />
        )}
        {isAdmin && <NavSection title={t('app.sectionAdmin')} items={ADMIN_NAV} />}
      </nav>

      <div className="mt-6 border-border border-t px-1 pt-4 pb-2">
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
    </aside>
  )
}
