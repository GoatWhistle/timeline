import type * as React from 'react'
import { NavLink } from 'react-router'
import { cn } from '@/shared/styling/class-names/class-names'
import { TAP_TARGET } from '@/shared/ui/layout/mobile/mobile-state'

type RowIcon = React.ComponentType<{ className?: string }>

export const SHEET_ROW = cn(
  'flex w-full items-center gap-3 rounded-control px-2 text-copy',
  TAP_TARGET,
  'transition-colors duration-instant',
  'focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring',
)

export function PhoneSheetRow({
  icon: Icon,
  label,
  onClick,
  className,
  ...rest
}: {
  icon: RowIcon
  label: string
  onClick: () => void
  className?: string
} & React.ComponentProps<'button'>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(SHEET_ROW, 'hover:bg-surface-2', className)}
      {...rest}
    >
      <Icon className="size-5 shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate text-left">{label}</span>
    </button>
  )
}

export function PhoneSheetLink({
  to,
  icon: Icon,
  label,
  onNavigate,
  ...rest
}: {
  to: string
  icon: RowIcon
  label: string
  onNavigate: () => void
} & Omit<React.ComponentProps<typeof NavLink>, 'to' | 'children' | 'className'>) {
  return (
    <NavLink
      to={to}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          SHEET_ROW,
          isActive
            ? 'bg-accent-surface font-medium text-accent-surface-foreground'
            : 'text-muted-foreground hover:bg-surface-2 hover:text-foreground',
        )
      }
      {...rest}
    >
      <Icon className="size-5 shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </NavLink>
  )
}
