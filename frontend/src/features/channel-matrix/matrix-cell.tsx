import { Check, Circle, CopyCheck, Minus } from 'lucide-react'
import type { ComponentType } from 'react'
import { useTranslation } from 'react-i18next'
import type { CellState } from '@/entities/channel-matrix'
import { cn } from '@/shared/styling/class-names/class-names'

const ICON: Record<CellState, ComponentType<{ className?: string }>> = {
  chosen: Check,
  fallback: Circle,
  off: Minus,
  mirror: CopyCheck,
}

const TONE: Record<CellState, string> = {
  chosen: 'border-primary/40 bg-primary/10 text-primary',
  fallback: 'border-border bg-surface-2 text-foreground',
  off: 'border-transparent text-muted-foreground/60',
  mirror: 'border-dashed border-border text-muted-foreground',
}

export function MatrixCell({ state }: { state: CellState }) {
  const { t } = useTranslation('notification')
  const Icon = ICON[state]
  const label = t(`matrix.cell_${state}`)

  return (
    <span
      className={cn(
        'inline-flex size-7 items-center justify-center rounded-control border',
        TONE[state],
      )}
      title={label}
      data-cell={state}
    >
      <Icon className="size-4" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  )
}
