import type * as React from 'react'
import { cn } from '@/shared/styling/class-names/class-names'

export function FactList({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return <dl className={cn('flex flex-col', className)}>{children}</dl>
}

export function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-border border-b py-3 first:pt-0 last:border-b-0 last:pb-0">
      <dt className="text-caption text-muted-foreground">{label}</dt>
      <dd className="min-w-0 font-medium text-copy">{children}</dd>
    </div>
  )
}
