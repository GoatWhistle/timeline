import type * as React from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/styling/class-names/class-names'
import { Button } from '@/shared/ui/primitives/button'
import { FilterFigure } from './empty-figures/filter-figure'

export type EmptyFigure = (props: { label: string }) => React.ReactElement

export type EmptySize = 'page' | 'card'

export const EMPTY_SIZES: Record<EmptySize, string> = {
  page: 'min-h-[24rem] gap-6 px-6',
  card: 'min-h-[10rem] gap-3 px-4',
}

export function EmptyState({
  title,
  description,
  action,
  figure,
  filtered = false,
  onReset,
  size = 'page',
  heading = false,
}: {
  title: string
  description?: string
  action?: React.ReactNode
  figure?: EmptyFigure
  filtered?: boolean
  onReset?: () => void
  size?: EmptySize
  heading?: boolean
}) {
  const { t } = useTranslation()
  const Figure = filtered ? FilterFigure : figure
  const Title = heading ? 'h1' : 'p'

  return (
    <div
      className={cn(
        'flex flex-1 flex-col items-center justify-center text-center',
        EMPTY_SIZES[size],
      )}
    >
      {Figure && <Figure label={title} />}
      <div className="flex flex-col gap-2">
        <Title className="font-medium text-copy">{title}</Title>
        {description && <p className="text-meta text-muted-foreground">{description}</p>}
      </div>
      {filtered && onReset ? (
        <Button variant="outline" onClick={onReset}>
          {t('state.resetFilters')}
        </Button>
      ) : (
        action
      )}
    </div>
  )
}
