import { useTranslation } from 'react-i18next'
import { Wordmark } from '@/shared/ui/brand/wordmark'
import { CrossfadeSwap } from '@/shared/ui/motion/crossfade-swap'
import { DoorTimeline } from './door-timeline'
import styles from './door-wordmark.module.css'

export function AuthAside() {
  const { t, i18n } = useTranslation('auth')

  return (
    <aside className="flex flex-col gap-10">
      <Wordmark to="/login" className={styles.wordmark} />

      <CrossfadeSwap swapKey={i18n.language}>
        <h1 className="max-w-md text-balance font-semibold text-screen">{t('door.pitch')}</h1>
      </CrossfadeSwap>

      <div className="max-w-sm">
        <DoorTimeline />
      </div>
    </aside>
  )
}
