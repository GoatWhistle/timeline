import { useTranslation } from 'react-i18next'
import { Skeleton } from '@/shared/ui/states'

export function DeviceSkeleton({ rows = 3 }: { rows?: number }) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col divide-y divide-border" role="status" aria-busy="true">
      <span className="sr-only">{t('state.loading')}</span>
      {Array.from({ length: rows }, (_, index) => `device-skeleton-${index}`).map((key) => (
        <div key={key} className="flex items-start gap-3 py-3">
          <Skeleton className="mt-0.5 size-5 shrink-0 rounded-pill" />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="flex h-[22px] items-center">
              <Skeleton className="h-4 w-40" />
            </span>
            <span className="mt-0.5 flex h-[18px] items-center">
              <Skeleton className="h-3 w-32" />
            </span>
            <span className="flex h-[18px] items-center">
              <Skeleton className="h-3 w-56" />
            </span>
          </div>
          <Skeleton className="h-8 w-28 shrink-0 rounded-control" />
        </div>
      ))}
    </div>
  )
}
