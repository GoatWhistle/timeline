import { WifiOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useRealtime } from '@/shared/realtime/realtime-context'

export function ConnectionBanner() {
  const { degraded } = useRealtime()
  const { t } = useTranslation('common')

  if (!degraded) return null

  return (
    <div
      role="status"
      aria-live="polite"
      data-connection-banner=""
      className="mb-4 flex items-center gap-3 rounded-control border border-border bg-surface-1 px-3 py-2 motion-safe:animate-stage-in"
    >
      <WifiOff className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <p className="min-w-0 flex-1 truncate text-caption text-muted-foreground">
        {t('realtime.offline')}
      </p>
    </div>
  )
}
