import type * as React from 'react'
import { cn } from '@/shared/styling/class-names/class-names'
import { Skeleton } from '@/shared/ui/states'

export const SUMMARY_SHELL =
  'flex min-w-20 flex-col gap-0.5 rounded-control px-2.5 py-1.5 text-left'

export function SummaryBar({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section
      aria-label={label}
      className={cn(
        'flex flex-wrap items-center gap-1 border-border border-b px-2 py-1.5',
        className,
      )}
    >
      {children}
    </section>
  )
}

export function SummaryDivider() {
  return <span className="mx-1 h-6 w-px bg-border" aria-hidden="true" />
}

export function SummaryMetric({
  label,
  value,
  pending = false,
  tone,
  sign,
}: {
  label: string
  value: React.ReactNode
  pending?: boolean
  tone?: string
  sign?: React.ReactNode
}) {
  return (
    <div className={SUMMARY_SHELL}>
      <span className="flex items-center gap-1.5">
        {sign}
        <span className="text-caption text-muted-foreground">{label}</span>
      </span>
      {pending ? (
        <Skeleton className="mt-0.5 h-4 w-8" />
      ) : (
        <span className={cn('tabular font-medium text-copy', tone)}>{value}</span>
      )}
    </div>
  )
}
