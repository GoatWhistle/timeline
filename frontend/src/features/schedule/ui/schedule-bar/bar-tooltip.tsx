import { CatalogCover } from '@/entities/catalog/catalog-cover'
import type { ScheduleRow } from '@/shared/api/types.gen'
import styles from './bar-tooltip.module.css'

export function BarTooltip({ row }: { row: ScheduleRow }) {
  return (
    <span data-bar-tooltip="" className={styles.card}>
      <CatalogCover coverUrl={row.cover_url} color={row.color ?? null} />
      <span className={styles.title}>{row.title}</span>
    </span>
  )
}
