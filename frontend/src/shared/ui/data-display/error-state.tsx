import { AlertCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { isApiError } from '@/shared/api/errors'
import { Button } from '@/shared/ui/primitives/button'

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { t } = useTranslation()

  const message = isApiError(error)
    ? error.message
    : error instanceof Error
      ? error.message
      : t('state.loadFailed')
  const requestId = isApiError(error) ? error.requestId : undefined

  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-surface border border-destructive/40 bg-destructive/5 py-12 text-center"
    >
      <AlertCircle className="size-8 text-destructive" aria-hidden="true" />
      <div>
        <p className="font-medium text-copy">{message}</p>
        {requestId && (
          <p className="font-mono text-caption text-muted-foreground">
            {t('state.requestId', { id: requestId })}
          </p>
        )}
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          {t('action.retry')}
        </Button>
      )}
    </div>
  )
}
