import { toast } from 'sonner'
import type { BatchResult } from '@/shared/api/types.gen'

/**
 * Показывает итог пакетной операции. По соглашениям API частичный отказ не
 * является ошибкой всей операции, поэтому пропуски выводятся отдельно.
 */
export function reportBatchResult(result: BatchResult, successMessage: string): void {
  const { succeeded, skipped, failed, results } = result

  if (failed === 0 && skipped === 0) {
    toast.success(successMessage, { description: `Обработано записей: ${succeeded}` })
    return
  }

  const problems = results
    .filter((item) => item.status !== 'ok')
    .map((item) => item.message ?? item.code ?? 'без описания')

  const summary = [
    `Успешно: ${succeeded}`,
    skipped > 0 ? `пропущено: ${skipped}` : null,
    failed > 0 ? `с ошибкой: ${failed}` : null,
  ]
    .filter(Boolean)
    .join(', ')

  const notify = failed > 0 ? toast.error : toast.warning
  notify(successMessage, {
    description: [summary, ...problems.slice(0, 5)].join('\n'),
  })
}
