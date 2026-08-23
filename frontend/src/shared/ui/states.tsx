import { AlertCircle, Inbox } from 'lucide-react'
import type * as React from 'react'
import { isApiError } from '@/shared/api/errors'
import { cn } from '@/shared/lib/cn'
import { Button } from './button'
import { Spinner } from './spinner'

export function LoadingState({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-center py-16', className)}>
      <Spinner className="size-5" />
    </div>
  )
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-center">
      <Inbox className="size-8 text-muted-foreground" aria-hidden="true" />
      <div>
        <p className="font-medium">{title}</p>
        {description && <p className="text-muted-foreground text-sm">{description}</p>}
      </div>
      {action}
    </div>
  )
}

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
