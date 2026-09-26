import { Children, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { PanelHead } from '@/shared/ui/overlays/panel-head'
import { FilterAddMenu } from './filter-add-menu'
import type { FilterOption } from './filter-choice'
import { FilterRowList } from './filter-row-list'

export type FilterSurfaceProps = {
  count: number
  available: readonly FilterOption[]
  onAdd: (field: string) => void
  onReset: () => void
  onOpenChange?: (open: boolean) => void
  children: ReactNode
}

export function FilterHead({
  count,
  title,
  onReset,
  end,
}: {
  count: number
  title: ReactNode
  onReset: () => void
  end?: ReactNode
}) {
  const { t } = useTranslation()

  return (
    <PanelHead
      title={title}
      resetLabel={t('filters.reset')}
      onReset={count > 0 ? onReset : undefined}
      end={end}
    />
  )
}

export function FilterBody({
  available,
  onAdd,
  children,
}: {
  available: readonly FilterOption[]
  onAdd: (field: string) => void
  children: ReactNode
}) {
  const { t } = useTranslation()
  const empty = Children.count(children) === 0

  return (
    <div data-filter-body="" className="@container flex flex-col p-3">
      {empty && (
        <p className="pb-3 text-meta text-muted-foreground motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-base">
          {t('filters.empty')}
        </p>
      )}
      <FilterRowList>{children}</FilterRowList>
      <FilterAddMenu available={available} onAdd={onAdd} />
    </div>
  )
}
