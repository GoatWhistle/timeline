import {
  Activity,
  AlarmClock,
  Archive,
  CalendarRange,
  ClipboardList,
  Compass,
  RotateCcwClock,
  ScrollText,
  Send,
  Users,
  UsersRound,
} from 'lucide-react'
import type * as React from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, useLocation } from 'react-router'
import { cn } from '@/shared/styling/class-names/class-names'
import { GroupLabel } from '@/shared/ui/data-display/group-label/group-label'
import { SlidingIndicator } from '@/shared/ui/navigation/sliding-indicator/sliding-indicator'
import { useSlidingIndicator } from '@/shared/ui/navigation/sliding-indicator/use-sliding-indicator'

export type NavItem = {
  to: string
  labelKey: string
  icon: React.ComponentType<{ className?: string }>
}

export const CATALOG_NAV: NavItem[] = [{ to: '/catalog', labelKey: 'nav.catalog', icon: Compass }]

export const MINE_NAV: NavItem[] = [
  { to: '/schedule', labelKey: 'nav.schedule', icon: CalendarRange },
  { to: '/teams', labelKey: 'nav.teams', icon: UsersRound },
  { to: '/history', labelKey: 'nav.history', icon: RotateCcwClock },
]

export const ADMIN_NAV: NavItem[] = [
  { to: '/admin/events', labelKey: 'nav.adminEvents', icon: ClipboardList },
  { to: '/admin/deadlines', labelKey: 'nav.adminDeadlines', icon: AlarmClock },
  { to: '/admin/users', labelKey: 'nav.adminUsers', icon: Users },
  { to: '/admin/invites', labelKey: 'nav.adminInvites', icon: Send },
  { to: '/admin/audit', labelKey: 'nav.adminAudit', icon: ScrollText },
  { to: '/admin/ops', labelKey: 'nav.adminOps', icon: Activity },
  { to: '/admin/retention', labelKey: 'nav.adminRetention', icon: Archive },
]

export function NavSection({ title, items }: { title?: string; items: NavItem[] }) {
  const { t } = useTranslation()
  const location = useLocation()
  const { containerRef, box } = useSlidingIndicator<HTMLDivElement>(location.pathname)

  return (
    <div className="flex flex-col gap-0.5">
      {title !== undefined && (
        <GroupLabel as="p" className="px-3 py-1.5">
          {title}
        </GroupLabel>
      )}
      <div ref={containerRef} className="relative flex flex-col gap-0.5">
        <SlidingIndicator box={box} axis="y" />
        {items.map(({ to, labelKey, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            data-indicator-item
            className={({ isActive }) =>
              cn(
                'relative z-10 flex h-row items-center gap-2 rounded-control px-3 text-copy',
                'transition-colors duration-base ease-out',
                'focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring',
                isActive
                  ? 'font-medium text-accent-surface-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )
            }
          >
            {({ isActive }) => (
              <span
                data-indicator-active={isActive ? 'true' : undefined}
                className="flex flex-1 items-center gap-2"
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                {t(labelKey)}
              </span>
            )}
          </NavLink>
        ))}
      </div>
    </div>
  )
}
