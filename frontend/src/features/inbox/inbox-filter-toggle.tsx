import { useTranslation } from 'react-i18next'
import { Segmented } from '@/shared/ui/navigation/segmented'

export function InboxFilterToggle({
  unreadOnly,
  onChange,
}: {
  unreadOnly: boolean
  onChange: (unreadOnly: boolean) => void
}) {
  const { t } = useTranslation('notification')

  return (
    <Segmented
      value={unreadOnly ? 'unread' : 'all'}
      onChange={(value) => onChange(value === 'unread')}
      label={t('inbox.page.unreadOnly')}
      options={[
        { value: 'all', label: t('inbox.page.all') },
        { value: 'unread', label: t('inbox.page.unreadOnly') },
      ]}
    />
  )
}
