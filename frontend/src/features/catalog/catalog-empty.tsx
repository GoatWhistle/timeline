import { useTranslation } from 'react-i18next'
import {
  BrandMark,
  DashedRect,
  FigureFrame,
} from '@/shared/ui/data-display/empty-figures/figure-frame'
import { EmptyState } from '@/shared/ui/data-display/empty-state'

function CatalogEmptyFigure({ label }: { label: string }) {
  return (
    <FigureFrame label={label}>
      <DashedRect />
      <BrandMark />
    </FigureFrame>
  )
}

export function CatalogEmpty({
  filtered,
  onResetFilters,
}: {
  filtered: boolean
  onResetFilters: () => void
}) {
  const { t } = useTranslation('event')
  const title = filtered ? t('catalog.empty.filteredTitle') : t('catalog.empty.title')
  const hint = filtered ? t('catalog.empty.filteredHint') : t('catalog.empty.hint')

  return (
    <EmptyState
      title={title}
      description={hint}
      figure={CatalogEmptyFigure}
      filtered={filtered}
      onReset={onResetFilters}
    />
  )
}
