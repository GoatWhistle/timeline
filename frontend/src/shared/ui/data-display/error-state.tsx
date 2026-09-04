import { useTranslation } from 'react-i18next'
import { failureKind, failureMessage, isRetryable, requestIdOf } from '@/shared/api/failure'
import { cn } from '@/shared/styling/class-names/class-names'
import { Button } from '@/shared/ui/primitives/button'
import {
  DeniedFigure,
  MissingFigure,
  NetworkFigure,
  OfflineFigure,
  ServerFigure,
  TimeoutFigure,
} from './empty-figures/failure-figures'
import { EMPTY_SIZES, type EmptyFigure, type EmptySize } from './empty-state'

function figureFor(error: unknown): EmptyFigure {
  switch (failureKind(error)) {
    case 'offline':
      return OfflineFigure
    case 'network':
      return NetworkFigure
    case 'timeout':
      return TimeoutFigure
    case 'server':
      return ServerFigure
    default:
      return apiFigure(error)
  }
}

function apiFigure(error: unknown): EmptyFigure {
  const status = (error as { status?: number } | null)?.status
  if (status === 403) return DeniedFigure
  if (status === 404) return MissingFigure
  return MissingFigure
}

export function ErrorState({
  error,
  onRetry,
  action,
  size = 'page',
}: {
  error: unknown
  onRetry?: () => void
  action?: React.ReactNode
  size?: EmptySize
}) {
  const { t } = useTranslation()
  const Figure = figureFor(error)
  const message = failureMessage(error)
  const requestId = requestIdOf(error)
  const retryable = isRetryable(error)

  return (
    <div
      role="alert"
      className={cn(
        'flex flex-1 flex-col items-center justify-center text-center',
        EMPTY_SIZES[size],
      )}
    >
      <Figure label={message} />
      <div className="flex flex-col gap-2">
        <p className="font-medium text-copy">{message}</p>
        {requestId && (
          <p className="font-mono text-caption text-muted-foreground">
            {t('state.requestId', { id: requestId })}
          </p>
        )}
      </div>
      {onRetry && retryable ? (
        <Button variant="outline" onClick={onRetry}>
          {t('action.retry')}
        </Button>
      ) : (
        action
      )}
    </div>
  )
}
