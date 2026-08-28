import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/styling/class-names/class-names'
import { Skeleton } from '../skeleton/skeleton'

const WIDTHS = ['w-[70%]', 'w-[55%]', 'w-[45%]', 'w-[60%]', 'w-[35%]', 'w-[50%]']

export type SkeletonRowDensity = 'text' | 'action'

const INNER_HEIGHT: Record<SkeletonRowDensity, string> = {
  text: 'h-5',
  action: 'h-8',
}

export function SkeletonTable({
  rows = 8,
  columns = 4,
  density = 'text',
  className,
}: {
  rows?: number
  columns?: number
  density?: SkeletonRowDensity
  className?: string
}) {
  const { t } = useTranslation()

  return (
    <div
      className={cn('w-full overflow-hidden rounded-lg border', className)}
      role="status"
      aria-busy="true"
    >
      <span className="sr-only">{t('state.loading')}</span>
      <table className="w-full caption-bottom text-sm">
        <thead className="[&_tr]:border-b">
          <tr className="border-b">
            {Array.from({ length: columns }, (_, index) => `skeleton-head-${index}`).map((key) => (
              <th key={key} className="h-10 px-3 text-left align-middle">
                <Skeleton className="h-3 w-[40%]" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&_tr:last-child]:border-0">
          {Array.from({ length: rows }, (_, index) => `skeleton-body-${index}`).map((rowKey) => (
            <tr key={rowKey} className="border-b">
              {Array.from({ length: columns }, (_, index) => `${rowKey}-cell-${index}`).map(
                (cellKey, index) => (
                  <td key={cellKey} className="px-3 py-2 align-middle">
                    <span className={cn('flex items-center', INNER_HEIGHT[density])}>
                      <Skeleton className={cn('h-3', WIDTHS[index % WIDTHS.length])} />
                    </span>
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
