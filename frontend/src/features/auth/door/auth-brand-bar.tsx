import { useTranslation } from 'react-i18next'
import { Wordmark } from '@/shared/ui/brand/wordmark'
import { CrossfadeSwap } from '@/shared/ui/motion/crossfade-swap'
import styles from './door-wordmark.module.css'

export function AuthBrandBar() {
  const { t, i18n } = useTranslation('auth')

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <Wordmark to="/login" className={styles.wordmark} />
      <CrossfadeSwap swapKey={i18n.language} className="w-full justify-items-center">
        <p className="max-w-xs text-balance text-copy text-muted-foreground">{t('door.pitch')}</p>
      </CrossfadeSwap>
    </div>
  )
}
