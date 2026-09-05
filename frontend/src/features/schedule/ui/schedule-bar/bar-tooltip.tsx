import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { eventColorAttrs } from '@/entities/event/event-color'
import type { ScheduleRow } from '@/shared/api/types.gen'
import { formatMoney } from '@/shared/money/money'
import styles from './bar-tooltip.module.css'

export function BarTooltip({ row }: { row: ScheduleRow }) {
  const { t } = useTranslation()
  const [broken, setBroken] = useState(false)
  const prize = formatMoney(row.prize_pool, row.prize_currency)
  const showImage = Boolean(row.cover_url) && !broken

  return (
    <span {...eventColorAttrs(row.color ?? null)} className={styles.card}>
      <span className={styles.cover}>
        {showImage ? (
          <img
            src={row.cover_url ?? ''}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setBroken(true)}
            className={styles.image}
          />
        ) : (
          <span aria-hidden="true" className={styles.initial}>
            {row.title.slice(0, 1)}
          </span>
        )}
      </span>

      <span className={styles.title}>{row.title}</span>

      {prize && (
        <span className={styles.prize}>
          <span className={styles.prizeLabel}>{t('schedule.prizePool')}</span>
          <span className={styles.prizeValue}>{prize}</span>
        </span>
      )}
    </span>
  )
}
