import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { myEventsQuery } from '@/entities/event/event.queries'
import { EventRow } from '@/entities/event/event-row/event-row'
import { EventDetailPane } from '@/features/event-detail-pane/event-detail-pane'
import { useListNavigation } from '@/shared/hooks/use-list-navigation/use-list-navigation'
import { usePageParam, useUrlFilters } from '@/shared/hooks/use-url-filters/use-url-filters'
import { EmptyState } from '@/shared/ui/data-display/empty-state'
import { Checkbox } from '@/shared/ui/forms/checkbox'
import { Label } from '@/shared/ui/forms/label'
import { DetailPane, ListPane, ThreePane } from '@/shared/ui/layout/three-pane/three-pane'
import { Pagination } from '@/shared/ui/navigation/pagination'
import { QueryBoundary, SkeletonRows } from '@/shared/ui/states'

const DEFAULTS = { archived: '', selected: '' }

export function MyEventsPage() {
  const { t } = useTranslation('event')
  const [filters, setFilters] = useUrlFilters(DEFAULTS)
  const [page, setPage] = usePageParam()
  const includeArchived = filters.archived === '1'

  const query = useQuery(myEventsQuery({ include_archived: includeArchived, page }))
  const items = query.data?.items ?? []
  const selected = filters.selected || null

  useListNavigation({
    ids: items.map((item) => item.id),
    selected,
    onSelect: (id) => setFilters({ selected: id }, { resetPage: false }),
    onClear: () => setFilters({ selected: undefined }, { resetPage: false }),
    scopeId: 'my-event-list',
  })

  return (
    <ThreePane>
      <ListPane>
        <header className="flex items-center gap-3 border-border border-b px-4 py-3">
          <h1 className="font-semibold text-screen tracking-tight">{t('list.myTitle')}</h1>
          <div className="ml-auto flex items-center gap-2">
            <Checkbox
              id="include-archived"
              checked={includeArchived}
              onCheckedChange={(checked) =>
                setFilters({ archived: checked === true ? '1' : undefined })
              }
            />
            <Label htmlFor="include-archived" className="text-meta">
              {t('list.showArchived')}
            </Label>
          </div>
        </header>

        <QueryBoundary
          isPending={query.isPending}
          isFetching={query.isFetching}
          isError={query.isError}
          error={query.error}
          onRetry={() => query.refetch()}
          hasData={query.data !== undefined}
          skeleton={<SkeletonRows rows={8} />}
        >
          {items.length === 0 ? (
            <div className="p-4">
              <EmptyState title={t('list.myEmpty')} />
            </div>
          ) : (
            <>
              <div role="listbox" aria-label={t('list.myTitle')} className="flex flex-col">
                {items.map((item) => (
                  <EventRow
                    key={item.id}
                    event={item}
                    selected={item.id === selected}
                    onSelect={(id) =>
                      setFilters(
                        { selected: id === selected ? undefined : id },
                        { resetPage: false },
                      )
                    }
                  />
                ))}
              </div>
              {query.data && (
                <div className="p-4">
                  <Pagination meta={query.data.meta} onPageChange={setPage} />
                </div>
              )}
            </>
          )}
        </QueryBoundary>
      </ListPane>

      <DetailPane
        open={selected !== null}
        onClose={() => setFilters({ selected: undefined }, { resetPage: false })}
        labelledBy="event-detail-title"
      >
        {selected && (
          <EventDetailPane
            id={selected}
            onClose={() => setFilters({ selected: undefined }, { resetPage: false })}
          />
        )}
      </DetailPane>
    </ThreePane>
  )
}
