import { CalendarRange, LayoutGrid, UsersRound } from 'lucide-react'
import type * as React from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, useLocation } from 'react-router'
import { cn } from '@/shared/styling/class-names/class-names'
import { TOUCH_REACH } from '@/shared/styling/touch/touch-reach'
import { SlidingIndicator } from '@/shared/ui/navigation/sliding-indicator/sliding-indicator'
import { useSlidingIndicator } from '@/shared/ui/navigation/sliding-indicator/use-sliding-indicator'

type Section = {
  segment: string
  labelKey: string
  icon: React.ComponentType<{ className?: string }>
}

export const TEAM_SECTIONS: Section[] = [
  { segment: '', labelKey: 'sectionOverview', icon: LayoutGrid },
  { segment: 'members', labelKey: 'sectionMembers', icon: UsersRound },
  { segment: 'events', labelKey: 'sectionEvents', icon: CalendarRange },
]

const CELL = cn(
  'relative z-10 inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap',
  'rounded-control px-3 font-medium text-copy',
  TOUCH_REACH,
  'transition-colors duration-base ease-out',
  'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
)

export function TeamSectionNav({ teamId }: { teamId: string }) {
  const { t } = useTranslation('team')
  const location = useLocation()
  const { containerRef, box } = useSlidingIndicator<HTMLDivElement>(location.pathname, 'x')

  return (
    <nav aria-label={t('sectionNavLabel')}>
      <div
        ref={containerRef}
        className={cn(
          'relative flex h-9 items-stretch gap-0.5 rounded-surface bg-muted p-1',
          'sm:inline-flex',
          'pointer-coarse:h-12',
          'text-muted-foreground',
        )}
      >
        <SlidingIndicator
          box={box}
          axis="x"
          className="my-1 rounded-control bg-background shadow-flat"
        />
        {TEAM_SECTIONS.map(({ segment, labelKey, icon: Icon }) => {
          const to = segment === '' ? `/teams/${teamId}` : `/teams/${teamId}/${segment}`
          return (
            <NavLink
              key={segment}
              to={to}
              end={segment === ''}
              data-indicator-item
              className={CELL}
            >
              {({ isActive }) => (
                <span
                  data-indicator-active={isActive ? 'true' : undefined}
                  className={cn(
                    'inline-flex items-center gap-1.5',
                    isActive ? 'text-foreground' : undefined,
                  )}
                >
                  <Icon className="size-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">{t(labelKey)}</span>
                </span>
              )}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
