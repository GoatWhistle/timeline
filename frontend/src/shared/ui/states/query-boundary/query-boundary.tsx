import type { ReactNode } from 'react'
import { cn } from '@/shared/styling/class-names/class-names'
import type { EmptySize } from '@/shared/ui/data-display/empty-state'
import { ErrorState } from '@/shared/ui/data-display/error-state'
import { Spinner } from '@/shared/ui/data-display/spinner'
import type { LoadingShape } from '../loading-policy/loading-policy'
import { useLoadingIndicator } from '../loading-policy/use-loading-indicator'

export function QueryBoundary({
  isPending,
  isFetching = false,
  isError = false,
  error,
  onRetry,
  hasData = false,
  shape = 'known',
  skeleton,
  size = 'page',
  children,
}: {
  isPending: boolean
  isFetching?: boolean
  isError?: boolean
  error?: unknown
  onRetry?: () => void
  hasData?: boolean
  shape?: LoadingShape
  skeleton?: ReactNode
  size?: EmptySize
  children: ReactNode
}) {
  const indicator = useLoadingIndicator({ isPending, isFetching, hasData, shape })

  if (isError) return <ErrorState error={error} onRetry={onRetry} size={size} />

  if (indicator === 'skeleton') return <>{skeleton}</>

  if (indicator === 'spinner') {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner className="size-5" />
      </div>
    )
  }

  if (indicator === 'none' && !hasData) return null

  return (
    <div
      className={cn(
        'flex min-h-0 min-w-0 flex-1 flex-col',
        indicator === 'stale' && 'pointer-events-none opacity-60 transition-opacity duration-fast',
      )}
      aria-busy={indicator === 'stale' || undefined}
    >
      {children}
    </div>
  )
}
