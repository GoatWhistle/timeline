import { useTranslation } from 'react-i18next'
import { formatDate } from '@/shared/datetime/datetime'
import { dayLabelKind } from './inbox-day-groups'

export function InboxDayHeader({ date }: { date: Date }) {
  const { t } = useTranslation('notification')
  const kind = dayLabelKind(date)

  if (kind === 'today' || kind === 'yesterday') {
    return <h3 className="text-copy text-muted-foreground">{t(`inbox.day.${kind}`)}</h3>
  }

  return <h3 className="text-copy text-muted-foreground">{formatDate(date.toISOString())}</h3>
}
