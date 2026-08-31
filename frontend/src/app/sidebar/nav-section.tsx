import {
  Activity,
  AlarmClock,
  CalendarRange,
  ClipboardList,
  Compass,
  LayoutList,
  ScrollText,
  Send,
  Users,
} from 'lucide-react'
import type * as React from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router'
import { cn } from '@/shared/styling/class-names/class-names'

export type NavItem = {
  to: string
  labelKey: string
  icon: React.ComponentType<{ className?: string }>
}

export const USER_NAV: NavItem[] = [
  { to: '/', labelKey: 'nav.myEvents', icon: LayoutList },
  { to: '/catalog', labelKey: 'nav.catalog', icon: Compass },
  { to: '/schedule', labelKey: 'nav.schedule', icon: CalendarRange },
]

export const ADMIN_NAV: NavItem[] = [
  { to: '/admin/events', labelKey: 'nav.adminEvents', icon: ClipboardList },
  { to: '/admin/schedule', labelKey: 'nav.adminSchedule', icon: CalendarRange },
  { to: '/admin/deadlines', labelKey: 'nav.adminDeadlines', icon: AlarmClock },
  { to: '/admin/users', labelKey: 'nav.adminUsers', icon: Users },
  { to: '/admin/invites', labelKey: 'nav.adminInvites', icon: Send },
  { to: '/admin/audit', labelKey: 'nav.adminAudit', icon: ScrollText },
  { to: '/admin/ops', labelKey: 'nav.adminOps', icon: Activity },
]

export function NavSection({ title, items }: { title: string; items: NavItem[] }) {
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
              'flex h-row items-center gap-2 rounded-control px-3 text-copy transition-colors duration-instant',
              'focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring',
              isActive
                ? 'bg-accent-surface font-medium text-accent-surface-foreground'
                : 'text-muted-foreground hover:bg-surface-2 hover:text-foreground',
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
