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

  return (
    <div className={styles.frame} data-schedule-empty={reason === 'none' ? 'none' : reason}>
      {reason === 'invitation' && (
        <EmptyState
          title={t('schedule.myEmpty')}
          description={t('schedule.myEmptyHint')}
          figure={ScheduleFigure}
          action={
            <Button asChild variant="outline">
              <Link to="/catalog">{t('action.browseCatalog')}</Link>
            </Button>
          }
        />
      )}
      {children}
    </div>
  )
}
