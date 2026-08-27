import { AlertCircle } from 'lucide-react'
import { isApiError } from '@/shared/api/errors'
import { Button } from '@/shared/ui/primitives/button'

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message = isApiError(error)
    ? error.message
    : error instanceof Error
      ? error.message
      : 'Не удалось загрузить данные'
  const requestId = isApiError(error) ? error.requestId : undefined

  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-lg border border-destructive/40 bg-destructive/5 py-12 text-center"
    >
      <AlertCircle className="size-8 text-destructive" aria-hidden="true" />
      <div>
        <p className="font-medium">{message}</p>
        {requestId && (
          <p className="text-muted-foreground text-xs">Идентификатор запроса: {requestId}</p>
        )}
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Повторить
        </Button>
      )}
    </div>
  )
}
