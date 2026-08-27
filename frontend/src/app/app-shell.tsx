import {
  AlarmClock,
  CalendarRange,
  ClipboardList,
  LayoutList,
  LogOut,
  ScrollText,
  Send,
  UserCog,
  Users,
} from 'lucide-react'
import type * as React from 'react'
import { Suspense } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router'
import { useLogout } from '@/entities/session/session.queries'
import { VerificationBanner } from '@/features/auth/verification-banner/verification-banner'
import { useSession } from '@/shared/api/session'
import { cn } from '@/shared/styling/class-names/class-names'
import { Button } from '@/shared/ui/primitives/button'
import { ThemeToggle } from '@/shared/ui/primitives/theme-toggle'
import { RouteFallback } from './route-fallback'

type NavItem = { to: string; label: string; icon: React.ComponentType<{ className?: string }> }

const USER_NAV: NavItem[] = [
  { to: '/', label: 'Мои события', icon: LayoutList },
  { to: '/timeline', label: 'Временная шкала', icon: CalendarRange },
  { to: '/profile', label: 'Профиль', icon: UserCog },
]

const ADMIN_NAV: NavItem[] = [
  { to: '/admin/events', label: 'События', icon: ClipboardList },
  { to: '/admin/timeline', label: 'Шкала', icon: CalendarRange },
  { to: '/admin/deadlines', label: 'Дедлайны', icon: AlarmClock },
  { to: '/admin/users', label: 'Пользователи', icon: Users },
  { to: '/admin/invites', label: 'Приглашения', icon: Send },
  { to: '/admin/audit', label: 'Аудит', icon: ScrollText },
]

function NavSection({ title, items }: { title: string; items: NavItem[] }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="px-3 py-2 font-medium text-muted-foreground text-xs uppercase tracking-wide">
        {title}
      </p>
      {items.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
              isActive
                ? 'bg-accent-surface font-medium text-accent-surface-foreground'
                : 'text-muted-foreground hover:bg-accent-surface hover:text-accent-surface-foreground',
            )
          }
        >
          <Icon className="size-4 shrink-0" />
          {label}
        </NavLink>
      ))}
    </div>
  )
}

export function AppShell() {
  const { user, isAdmin } = useSession()
  const logout = useLogout()
  const navigate = useNavigate()

  async function onLogout() {
    await logout.mutateAsync().catch(() => undefined)
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-screen">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2"
      >
        Перейти к содержимому
      </a>

      <aside className="flex w-64 shrink-0 flex-col justify-between border-r bg-card p-3">
        <nav aria-label="Основная навигация" className="flex flex-col gap-4">
          <div className="px-3 py-2">
            <p className="font-semibold">Hackathon Tracker</p>
          </div>
          <NavSection title="Участник" items={USER_NAV} />
          {isAdmin && <NavSection title="Администрирование" items={ADMIN_NAV} />}
        </nav>

        <div className="flex flex-col gap-2 border-t p-3">
          <div className="min-w-0">
            <p className="truncate font-medium text-sm">{user?.display_name}</p>
            <p className="truncate text-muted-foreground text-xs">{user?.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={onLogout}
              disabled={logout.isPending}
            >
              <LogOut className="size-4" />
              Выйти
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </aside>

      <main id="main" className="min-w-0 flex-1 p-8">
        <VerificationBanner />
        <Suspense fallback={<RouteFallback />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  )
}
