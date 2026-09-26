import { RotateCcw } from 'lucide-react'
import { Children, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/ui/primitives/button'
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
    <header className="flex h-row shrink-0 items-center gap-1 border-border border-b pr-1.5 pl-3">
      <span className="min-w-0 flex-1">{title}</span>
      {count > 0 && (
        <Button
          variant="ghost"
          size="icon"
          aria-label={t('filters.reset')}
          title={t('filters.reset')}
          onClick={onReset}
          className="size-8 shrink-0 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-75 motion-safe:duration-fast"
        >
          <RotateCcw className="size-4" aria-hidden="true" />
        </Button>
      )}
      {end}
    </header>
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
