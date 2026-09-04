import { useTranslation } from 'react-i18next'
import { Wordmark } from '@/shared/ui/brand/wordmark'
import { DoorTimeline } from './door-timeline'
import styles from './door-wordmark.module.css'

export function AuthAside() {
  const { t } = useTranslation('auth')

  return (
    <aside className="flex flex-col gap-10">
      <Wordmark to="/login" className={styles.wordmark} />

      <div className="flex flex-col gap-3">
        <h1 className="max-w-md text-balance font-semibold text-screen">{t('door.pitch')}</h1>
        <p className="max-w-md text-pretty text-copy text-muted-foreground">
          {t('door.pitchHint')}
        </p>
      </div>

      <div className="max-w-sm">
        <DoorTimeline />
      </div>
    </aside>
  )
}
