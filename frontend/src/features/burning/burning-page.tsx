import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { myEventsQuery } from '@/entities/event/event.queries'
import { EventDetailPane } from '@/features/event-detail-pane/event-detail-pane'
import { useListNavigation } from '@/shared/hooks/use-list-navigation/use-list-navigation'
import { useNow } from '@/shared/hooks/use-now/use-now'
import { EmptyState } from '@/shared/ui/data-display/empty-state'
import { DetailPane, ListPane, ThreePane } from '@/shared/ui/layout/three-pane/three-pane'
import { TooltipProvider } from '@/shared/ui/overlays/tooltip'
import { QueryBoundary } from '@/shared/ui/states'
import { buildBurning } from './model/burning'
import { isQuiet, summarize } from './model/burning-summary'
import { useBurningFilters } from './model/use-burning-filters'
import { BurningRow } from './ui/burning-row/burning-row'
import { BurningSkeleton } from './ui/burning-skeleton/burning-skeleton'
import { BurningSummaryStrip } from './ui/burning-summary/burning-summary'
import { BurningToolbar } from './ui/burning-toolbar/burning-toolbar'

const PAGE_SIZE = 100

export function BurningPage() {
  const { t } = useTranslation('event')
  const now = useNow()
  const { filters, selected, setSort, setActiveOnly, setNeedsAction, setSelected } =
    useBurningFilters()

  const query = useQuery(
    myEventsQuery({ include_archived: !filters.activeOnly, page: 1, page_size: PAGE_SIZE }),
  )

  const items = useMemo(
    () => buildBurning(query.data?.items ?? [], filters, now),
    [query.data, filters, now],
  )
  const summary = useMemo(() => summarize(items), [items])

  useListNavigation({
    ids: items.map((item) => item.event.id),
    selected,
    onSelect: setSelected,
    onClear: () => setSelected(undefined),
    scopeId: 'burning-list',
  })

  return (
    <TooltipProvider>
      <ThreePane>
        <ListPane className="@container">
          <header className="flex items-center gap-3 border-border border-b px-4 py-3">
            <h1 className="font-semibold text-screen tracking-tight">{t('burning.title')}</h1>
            <p className="text-meta text-muted-foreground">{t('burning.subtitle')}</p>
          </header>

          <BurningSummaryStrip summary={summary} />

          <BurningToolbar
            filters={filters}
            onSort={setSort}
            onActiveOnly={setActiveOnly}
            onNeedsAction={setNeedsAction}
          />

          <QueryBoundary
            isPending={query.isPending}
            isFetching={query.isFetching}
            isError={query.isError}
            error={query.error}
            onRetry={() => query.refetch()}
            hasData={query.data !== undefined}
            skeleton={<BurningSkeleton rows={8} />}
          >
            {items.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  title={filters.needsAction ? t('burning.emptyAction') : t('burning.empty')}
                  description={t('burning.emptyHint')}
                />
              </div>
            ) : (
              <>
                {isQuiet(summary) && (
                  <p className="border-border/60 border-b px-4 py-2 text-meta text-muted-foreground">
                    {t('burning.quiet')}
                  </p>
                )}
                <div role="listbox" aria-label={t('burning.title')} className="flex flex-col">
                  {items.map((item) => (
                    <BurningRow
                      key={item.event.id}
                      item={item}
                      now={now}
                      selected={item.event.id === selected}
                      onSelect={(id) => setSelected(id === selected ? undefined : id)}
                    />
                  ))}
                </div>
              </>
            )}
          </QueryBoundary>
        </ListPane>

        <DetailPane
          open={selected !== null}
          onClose={() => setSelected(undefined)}
          labelledBy="event-detail-title"
        >
          {selected && <EventDetailPane id={selected} onClose={() => setSelected(undefined)} />}
        </DetailPane>
      </ThreePane>
    </TooltipProvider>
  )
}
