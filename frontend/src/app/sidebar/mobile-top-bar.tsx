import { Menu } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { InboxBell } from '@/features/inbox-bell/inbox-bell'
import { cn } from '@/shared/styling/class-names/class-names'
import { Wordmark } from '@/shared/ui/brand/wordmark'
import {
  BAR_SURFACE,
  PHONE_GUTTER,
  SAFE_SIDES,
  SAFE_TOP,
  TAP_TARGET,
} from '@/shared/ui/layout/mobile/mobile-state'

export function MobileTopBar({
  showBell,
  onOpenNav,
  navExpanded,
}: {
  showBell: boolean
  onOpenNav?: () => void
  navExpanded?: boolean
}) {
  const { t } = useTranslation()

  return (
    <header
      data-mobile-top-bar
      className={cn('sticky top-0 z-30 shrink-0 border-b', BAR_SURFACE, SAFE_TOP, SAFE_SIDES)}
    >
      <div className={cn('flex h-bar-top items-center gap-1', PHONE_GUTTER)}>
        {onOpenNav !== undefined && (
          <button
            type="button"
            onClick={onOpenNav}
            aria-label={t('app.expandSidebar')}
            aria-expanded={navExpanded === true}
            data-sidebar-toggle
            className={cn(
              'flex shrink-0 items-center justify-center rounded-control',
              TAP_TARGET,
              'text-muted-foreground transition-colors duration-instant',
              'hover:bg-surface-2 hover:text-foreground',
              'focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring',
            )}
          >
            <Menu className="size-5" aria-hidden="true" />
          </button>
        )}
        <Wordmark to="/schedule" className="min-w-0 flex-1" />
        {showBell && (
          <div className="flex shrink-0 items-center justify-end">
            <InboxBell touch />
          </div>
        )}
      </div>
    </header>
  )
}
