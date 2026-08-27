import { useTranslation } from 'react-i18next'
import { Spinner } from '@/shared/ui/data-display/spinner'

export function RouteFallback() {
  const { t } = useTranslation()

  return (
    <div className="flex items-center justify-center py-24 opacity-60">
      <Spinner className="size-5" label={t('state.loadingPage')} />
    </div>
  )
}
