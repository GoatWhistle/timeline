import { cn } from '@/shared/styling/class-names/class-names'
import styles from './logo-mark.module.css'

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={cn('size-8 shrink-0', className)}
    >
      <rect
        x="2.5"
        y="4.6"
        width="12"
        height="4.4"
        rx="2.2"
        fill="currentColor"
        className={styles.lead}
      />
      <rect
        x="7"
        y="9.8"
        width="14.5"
        height="4.4"
        rx="2.2"
        fill="currentColor"
        className={styles.peak}
      />
      <rect
        x="4.5"
        y="15"
        width="9.5"
        height="4.4"
        rx="2.2"
        fill="currentColor"
        className={styles.tail}
      />
    </svg>
  )
}
