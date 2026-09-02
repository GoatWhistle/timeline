import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { isAbsence } from '@/entities/personal/personal-absence'
import type { EmptyFigure } from '@/shared/ui/data-display/empty-state'
import { EmptyState } from '@/shared/ui/data-display/empty-state'
import { ErrorState } from '@/shared/ui/data-display/error-state'
import { SkeletonRows } from '@/shared/ui/states'

export function PersonalBoundary({
  isPending,
  isError,
  error,
  onRetry,
  figure,
  children,
}: {
  isPending: boolean
  isError: boolean
  error?: unknown
  onRetry?: () => void
  figure?: EmptyFigure
  children: ReactNode
}) {
  const { t } = useTranslation('event')

  if (isPending) return <SkeletonRows rows={3} />

  if (isError) {
    if (isAbsence(error)) {
      return (
        <EmptyState
          title={t('personal.absent')}
          description={t('personal.absentHint')}
          figure={figure}
        />
      )
    }
    return <ErrorState error={error} onRetry={onRetry} />
  }

  return <>{children}</>
}
