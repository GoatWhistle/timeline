import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/styling/class-names/class-names'

export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'block animate-pulse rounded-[4px] bg-muted motion-reduce:animate-none',
        className,
      )}
    />
  )
}

export function SkeletonRows({ rows = 8, className }: { rows?: number; className?: string }) {
  const { t } = useTranslation()

  return (
    <div className={cn('flex flex-col', className)} role="status" aria-busy="true">
      <span className="sr-only">{t('state.loading')}</span>
      {Array.from({ length: rows }, (_, index) => `skeleton-row-${index}`).map((key) => (
        <div key={key} className="flex h-row items-center gap-3 border-border/60 border-b px-3">
          <Skeleton className="h-3 w-[38%]" />
          <Skeleton className="h-3 w-[18%]" />
          <Skeleton className="ml-auto h-3 w-[12%]" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonDetail({ className }: { className?: string }) {
  const { t } = useTranslation()

  return (
    <div className={cn('flex flex-col gap-4 p-4', className)} role="status" aria-busy="true">
      <span className="sr-only">{t('state.loading')}</span>
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <div className="mt-2 flex flex-col gap-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-11/12" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  )
}
