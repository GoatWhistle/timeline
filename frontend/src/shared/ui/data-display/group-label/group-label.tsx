import type * as React from 'react'
import { cn } from '@/shared/styling/class-names/class-names'

export const GROUP_LABEL_TEXT =
  'font-medium text-caption text-muted-foreground uppercase tracking-wide'

export function GroupLabel({
  as: Heading = 'h3',
  icon,
  children,
  className,
  ...props
}: {
  as?: 'h2' | 'h3' | 'h4' | 'p'
  icon?: React.ReactNode
} & React.ComponentProps<'h3'>) {
  return (
    <Heading
      data-slot="group-label"
      className={cn(GROUP_LABEL_TEXT, icon ? 'flex items-center gap-1.5' : undefined, className)}
      {...props}
    >
      {icon}
      {children}
    </Heading>
  )
}
