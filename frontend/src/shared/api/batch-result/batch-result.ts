import { toast } from 'sonner'
import type { BatchResult } from '@/shared/api/types.gen'
import { i18n } from '@/shared/i18n/config'

export function reportBatchResult(result: BatchResult, successMessage: string): void {
  const { succeeded, skipped, failed, results } = result

  if (failed === 0 && skipped === 0) {
    toast.success(successMessage, {
      description: i18n.t('batch.processed', { count: succeeded }),
    })
    return
  }

  const problems = results
    .filter((item) => item.status !== 'ok')
    .map((item) => item.message ?? item.code ?? i18n.t('batch.noDescription'))

  const summary = [
    i18n.t('batch.succeeded', { count: succeeded }),
    skipped > 0 ? i18n.t('batch.skipped', { count: skipped }) : null,
    failed > 0 ? i18n.t('batch.failed', { count: failed }) : null,
  ]
    .filter(Boolean)
    .join(', ')

  const notify = failed > 0 ? toast.error : toast.warning
  notify(successMessage, {
    description: [summary, ...problems.slice(0, 5)].join('\n'),
  })
}
