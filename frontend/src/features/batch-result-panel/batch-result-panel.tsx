import { AlertCircle, CheckCircle2, MinusCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { BatchItemResult, BatchResult } from '@/shared/api/types.gen'
import { errorMessage } from '@/shared/i18n/error-message'
import { cn } from '@/shared/styling/class-names/class-names'
import { Spinner } from '@/shared/ui/data-display/spinner'
import { Button } from '@/shared/ui/primitives/button'

export type BatchRowStatus = 'ok' | 'skipped' | 'error'

const ICON: Record<BatchRowStatus, typeof CheckCircle2> = {
  ok: CheckCircle2,
  skipped: MinusCircle,
  error: AlertCircle,
}

const TONE: Record<BatchRowStatus, string> = {
  ok: 'text-status-done',
  skipped: 'text-muted-foreground',
  error: 'text-destructive',
}

export function rowStatus(item: BatchItemResult): BatchRowStatus {
  return item.status === 'ok' || item.status === 'skipped' ? item.status : 'error'
}

export function failedKeys(result: BatchResult): string[] {
  return (result.results ?? [])
    .filter((item) => rowStatus(item) === 'error')
    .map((item) => item.key ?? item.id ?? '')
    .filter((key) => key !== '')
}

export function BatchResultPanel({
  result,
  labelFor,
  onRetryFailed,
  isRetrying = false,
}: {
  result: BatchResult
  labelFor?: (item: BatchItemResult) => string | undefined
  onRetryFailed?: (keys: string[]) => void
  isRetrying?: boolean
}) {
  const { t } = useTranslation()
  const rows = result.results ?? []
  const retryable = failedKeys(result)

  return (
    <section
      aria-label={t('batch.resultTitle')}
      role="status"
      aria-live="polite"
      className={cn(
        'flex flex-col gap-2',
        'motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-1',
        'motion-safe:duration-base motion-safe:ease-out',
      )}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-meta">
        <span className="text-status-done">
          {t('batch.succeeded', { count: result.succeeded ?? 0 })}
        </span>
        <span className="text-muted-foreground">
          {t('batch.skipped', { count: result.skipped ?? 0 })}
        </span>
        <span className={cn((result.failed ?? 0) > 0 && 'text-destructive')}>
          {t('batch.failed', { count: result.failed ?? 0 })}
        </span>
      </div>

      {rows.length > 0 && (
        <ul className="max-h-64 divide-y divide-border overflow-y-auto rounded-control border border-border">
          {rows.map((item, index) => {
            const status = rowStatus(item)
            const Icon = ICON[status]
            return (
              <li
                key={item.key ?? item.id ?? `batch-row-${index}`}
                className="flex items-start gap-2 px-3 py-2 text-meta"
              >
                <Icon className={cn('mt-0.5 size-4 shrink-0', TONE[status])} aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">
                    {labelFor?.(item) ?? item.key ?? item.id ?? t('batch.unknownRow')}
                  </span>
                  {status !== 'ok' && (
                    <span className="block text-muted-foreground">
                      {(item.code ? errorMessage(item.code) : undefined) ??
                        item.message ??
                        item.code ??
                        t('batch.noDescription')}
                    </span>
                  )}
                </span>
                <span className="sr-only">{t(`batch.status.${status}`)}</span>
              </li>
            )
          })}
        </ul>
      )}

      {onRetryFailed && retryable.length > 0 && (
        <div>
          <Button
            variant="outline"
            size="sm"
            disabled={isRetrying}
            aria-busy={isRetrying || undefined}
            onClick={() => onRetryFailed(retryable)}
          >
            {isRetrying && <Spinner className="size-3.5" label={t('batch.retrying')} />}
            {t('batch.retryFailed', { count: retryable.length })}
          </Button>
        </div>
      )}
    </section>
  )
}
