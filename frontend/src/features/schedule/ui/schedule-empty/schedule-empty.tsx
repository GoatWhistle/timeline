import type * as React from 'react'
import { cn } from '@/shared/styling/class-names/class-names'
import { PANEL_SURFACE } from '@/shared/ui/overlays/overlay-chrome'

export function ScheduleEmptyOverlay({
  empty,
  title,
  description,
  action,
  children,
}: {
  empty: boolean
  title: string
  description?: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  if (!empty) return <>{children}</>

  return (
    <div className="relative">
      <div className="opacity-45">{children}</div>

      <div className="pointer-events-none absolute inset-0 flex items-start justify-center p-6 pt-16">
        <div
          role="status"
          className={cn(
            PANEL_SURFACE,
            'pointer-events-auto flex max-w-sm flex-col items-center gap-3 px-6 py-5 text-center',
          )}
        >
          <p className="font-medium text-copy">{title}</p>
          {description && <p className="text-meta text-muted-foreground">{description}</p>}
          {action}
        </div>
      </div>
    </div>
  )
}
