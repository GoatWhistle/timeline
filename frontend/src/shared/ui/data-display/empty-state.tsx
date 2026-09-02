import type * as React from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/ui/primitives/button'
import { FilterFigure } from './empty-figures/filter-figure'

export type EmptyFigure = (props: { label: string }) => React.ReactElement

export function EmptyState({
  title,
  description,
  action,
  figure,
  filtered = false,
  onReset,
}: {
  title: string
  description?: string
  action?: React.ReactNode
  figure?: EmptyFigure
  filtered?: boolean
  onReset?: () => void
}) {
  const { t } = useTranslation()
  const Figure = filtered ? FilterFigure : figure

  return (
    <div className="flex flex-col items-center justify-center gap-6 rounded-lg border border-dashed px-6 py-12 text-center">
      {Figure && <Figure label={title} />}
      <div className="flex flex-col gap-2">
        <p className="font-medium text-copy">{title}</p>
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
