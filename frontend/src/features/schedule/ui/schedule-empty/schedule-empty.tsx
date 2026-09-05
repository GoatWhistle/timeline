import type * as React from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import type { EmptyReason } from '@/features/schedule/model/empty-reason'
import { ScheduleFigure } from '@/shared/ui/data-display/empty-figures/schedule-figures'
import { EmptyState } from '@/shared/ui/data-display/empty-state'
import { Button } from '@/shared/ui/primitives/button'
import styles from './schedule-empty.module.css'

export function ScheduleEmpty({
  reason,
  children,
}: {
  reason: EmptyReason
  children: React.ReactNode
}) {
  const { t } = useTranslation()

  if (reason === 'invitation' || reason === 'account') {
    return (
      <EmptyState
        title={t('schedule.myEmpty')}
        description={reason === 'invitation' ? t('schedule.myEmptyHint') : undefined}
        figure={ScheduleFigure}
        action={
          reason === 'invitation' ? (
            <Button asChild variant="outline">
              <Link to="/catalog">{t('action.browseCatalog')}</Link>
            </Button>
          ) : undefined
        }
      />
    )
  }

  return (
    <div className={styles.frame} data-schedule-empty={reason === 'period' ? 'period' : 'none'}>
      {children}
    </div>
  )
}
