import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/styling/class-names/class-names'
import { Skeleton } from '@/shared/ui/states'

export function BurningSkeleton({ rows = 8, className }: { rows?: number; className?: string }) {
  const { t } = useTranslation()

  return (
    <div className={cn('flex flex-col', className)} role="status" aria-busy="true">
      <span className="sr-only">{t('state.loading')}</span>
      {Array.from({ length: rows }, (_, index) => `burning-skeleton-${index}`).map((key) => (
        <div
          key={key}
          data-burning-skeleton-row
          className="flex h-row-roomy items-center gap-3 border-border/60 border-b pr-2 pl-0"
        >
          <span className="h-full w-[3px] shrink-0 bg-transparent" aria-hidden="true" />
          <span className="flex min-w-0 flex-1 items-center gap-3 py-1">
            <Skeleton className="size-1.5 shrink-0 rounded-full" />
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <Skeleton className="h-3 w-[42%]" />
              <Skeleton className="h-2.5 w-[26%]" />
            </span>
            <Skeleton className="@3xl:block hidden h-3 w-36 shrink-0" />
            <span className="@lg:flex hidden w-48 shrink-0 justify-end">
              <Skeleton className="h-5 w-28 rounded-full" />
            </span>
          </span>
          <span className="flex w-28 shrink-0 items-center justify-end gap-1">
            <Skeleton className="h-7 w-7 rounded-md" />
            <Skeleton className="h-7 w-16 rounded-md" />
          </span>
        </div>
      ))}
    </div>
  )
}
