import { cva, type VariantProps } from 'class-variance-authority'
import type * as React from 'react'
import { cn } from '@/shared/styling/class-names/class-names'

const badgeVariants = cva(
  'inline-flex w-fit items-center gap-1 whitespace-nowrap rounded-control border px-2 py-0.5 font-medium text-caption',
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
