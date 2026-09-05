import { Info, TriangleAlert } from 'lucide-react'
import type * as React from 'react'
import { cn } from '@/shared/styling/class-names/class-names'

export type NoteTone = 'neutral' | 'warning'

export const NOTE_SHELL = 'flex items-start gap-2 rounded-control border px-3 py-2 text-meta'

const NOTE_TONE: Record<NoteTone, string> = {
  neutral: 'border-border bg-surface-2',
  warning: 'border-destructive/40 bg-destructive/5',
}

type IconProps = { className?: string; 'aria-hidden'?: boolean }

const NOTE_ICON: Record<NoteTone, React.ComponentType<IconProps>> = {
  neutral: Info,
  warning: TriangleAlert,
}

export function Note({
  tone = 'neutral',
  title,
  icon,
  children,
  className,
  ...props
}: {
  tone?: NoteTone
  title?: React.ReactNode
  icon?: React.ComponentType<IconProps>
} & Omit<React.ComponentProps<'div'>, 'title'>) {
  const Icon = icon ?? NOTE_ICON[tone]

  return (
    <div
      data-slot="note"
      data-note-tone={tone}
      className={cn(NOTE_SHELL, NOTE_TONE[tone], className)}
      {...props}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden={true} />
      <div className="min-w-0 text-muted-foreground">
        {title === undefined ? null : <p className="font-medium text-copy">{title}</p>}
        {children === undefined ? null : (
          <div className={title === undefined ? undefined : 'mt-0.5'}>{children}</div>
        )}
      </div>
    </div>
  )
}
