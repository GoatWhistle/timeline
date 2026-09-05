import type * as React from 'react'
import { cn } from '@/shared/styling/class-names/class-names'

export function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      className={cn(
        'flex h-9 w-full rounded-control border border-input bg-transparent px-3 py-1 text-copy shadow-flat transition-colors',
        'placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'aria-invalid:border-destructive aria-invalid:outline-destructive',
        className,
      )}
      {...props}
    />
  )
}
