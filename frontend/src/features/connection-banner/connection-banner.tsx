import { WifiOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useRealtime } from '@/shared/realtime/realtime-context'
import styles from './connection-banner.module.css'

export function ConnectionBanner() {
  const { degraded } = useRealtime()
  const { t } = useTranslation('common')

  if (!degraded) return null

  return (
    <div className={styles.banner} role="status" aria-live="polite">
      <WifiOff className={styles.icon} aria-hidden />
      <span>{t('realtime.offline')}</span>
    </div>
  )
}
