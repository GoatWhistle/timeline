import { useTranslation } from 'react-i18next'
import { Wordmark } from '@/shared/ui/brand/wordmark'
import styles from './door-wordmark.module.css'

export function AuthBrandBar() {
  const { t } = useTranslation('auth')

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <Wordmark to="/login" className={styles.wordmark} />
      <p className="max-w-xs text-balance text-copy text-muted-foreground">{t('door.pitch')}</p>
    </div>
  )
}
