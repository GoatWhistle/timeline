import type * as React from 'react'
import { cn } from '@/shared/styling/class-names/class-names'
import styles from './view-swap.module.css'

export type SwapDirection = 'forward' | 'back' | 'scale'

export function ViewSwap({
  token,
  direction,
  children,
  className,
}: {
  token: string
  direction: SwapDirection
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn(styles.frame, className)} data-schedule-swap-frame>
      <div
        key={token}
        className={styles.pane}
        data-schedule-swap={token}
        data-swap-direction={direction}
      >
        {children}
      </div>
    </div>
  )
}
