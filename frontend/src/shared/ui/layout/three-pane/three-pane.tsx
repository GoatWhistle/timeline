import type { ReactNode } from 'react'
import { cn } from '@/shared/styling/class-names/class-names'

export function ThreePane({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex min-h-0 min-w-0 flex-1', className)}>{children}</div>
}

export function ListPane({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex min-w-0 flex-1 flex-col overflow-y-auto', className)}>{children}</div>
  )
}
