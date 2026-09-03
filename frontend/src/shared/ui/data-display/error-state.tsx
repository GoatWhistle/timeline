import { useTranslation } from 'react-i18next'
import { failureKind, failureMessage, isRetryable, requestIdOf } from '@/shared/api/failure'
import { Button } from '@/shared/ui/primitives/button'
import {
  DeniedFigure,
  MissingFigure,
  NetworkFigure,
  OfflineFigure,
  ServerFigure,
  TimeoutFigure,
} from './empty-figures/failure-figures'
import type { EmptyFigure } from './empty-state'

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
}: {
  error: unknown
  onRetry?: () => void
  action?: React.ReactNode
}) {
  const { t } = useTranslation()
  const Figure = figureFor(error)
  const message = failureMessage(error)
  const requestId = requestIdOf(error)
  const retryable = isRetryable(error)

  return (
    <div
      role="alert"
      className="flex min-h-[24rem] flex-1 flex-col items-center justify-center gap-6 px-6 text-center"
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
