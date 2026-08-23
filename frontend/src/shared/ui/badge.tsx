import { cva, type VariantProps } from 'class-variance-authority'
import type * as React from 'react'
import { cn } from '@/shared/lib/cn'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-medium text-xs',
  {
    variants: {
      tone: {
        neutral: 'border-transparent bg-secondary text-secondary-foreground',
        outline: 'text-foreground',
        primary: 'border-transparent bg-primary/10 text-primary',
        danger: 'border-transparent bg-destructive/10 text-destructive',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
)

export type BadgeProps = React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />
}

/** Точка-индикатор произвольного цвета: используется для состояний и типов этапов. */
export function Dot({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn('size-2 shrink-0 rounded-full', className)} />
}
