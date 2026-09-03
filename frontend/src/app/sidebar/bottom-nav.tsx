import { Menu } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { NavLink, useLocation } from 'react-router'
import { cn } from '@/shared/styling/class-names/class-names'
import {
  BAR_SURFACE,
  SAFE_BOTTOM,
  SAFE_SIDES,
  TAP_TARGET,
} from '@/shared/ui/layout/mobile/mobile-state'
import { SlidingIndicator } from '@/shared/ui/navigation/sliding-indicator/sliding-indicator'
import { useSlidingIndicator } from '@/shared/ui/navigation/sliding-indicator/use-sliding-indicator'
import type { NavItem } from './nav-section'

const CELL = cn(
  'relative z-10 flex flex-1 flex-col items-center justify-center gap-1',
  TAP_TARGET,
  'rounded-control px-1 text-caption',
  'transition-colors duration-base ease-out',
  'focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring',
)

export function BottomNav({
  items,
  onOpenMore,
  moreExpanded,
}: {
  items: NavItem[]
  onOpenMore: () => void
  moreExpanded: boolean
}) {
  const { t } = useTranslation()
  const location = useLocation()
  const { containerRef, box } = useSlidingIndicator<HTMLDivElement>(location.pathname, 'x')

  return (
    <nav
      aria-label={t('app.primaryNav')}
      data-bottom-nav
      className={cn(
        'fixed inset-x-0 bottom-0 z-30 border-t',
        BAR_SURFACE,
        SAFE_BOTTOM,
        SAFE_SIDES,
        'motion-safe:animate-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-base motion-safe:ease-out',
      )}
    >
      <div ref={containerRef} className="relative flex h-bar-bottom items-stretch gap-1 px-2">
        <SlidingIndicator box={box} axis="x" />
        {items.map(({ to, labelKey, icon: Icon }) => (
          <NavLink key={to} to={to} data-indicator-item className={CELL}>
            {({ isActive }) => (
              <span
                data-indicator-active={isActive ? 'true' : undefined}
                className={cn(
                  'flex flex-col items-center justify-center gap-1',
                  isActive ? 'font-medium text-accent-surface-foreground' : 'text-muted-foreground',
                )}
              >
                <Icon className="size-5 shrink-0" aria-hidden="true" />
                <span className="max-w-full truncate">{t(labelKey)}</span>
              </span>
            )}
          </NavLink>
        ))}
        <button
          type="button"
          onClick={onOpenMore}
          aria-expanded={moreExpanded}
          aria-haspopup="menu"
          data-sidebar-toggle
          data-bottom-more
          className={cn(CELL, 'text-muted-foreground')}
        >
          <Menu className="size-5 shrink-0" aria-hidden="true" />
          <span className="max-w-full truncate">{t('app.more')}</span>
        </button>
      </div>
    </nav>
  )
}
