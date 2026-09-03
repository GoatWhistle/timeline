import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { EVENT_STATE_KEY } from '@/entities/event/event.labels'
import { myEventsQuery } from '@/entities/event/event.queries'
import { EventRow } from '@/entities/event/event-row/event-row'
import { AssignedEventOverlay, useEventOverlay } from '@/features/event-overlay-card'
import { useListNavigation } from '@/shared/hooks/use-list-navigation/use-list-navigation'
import { usePageParam, useUrlFilters } from '@/shared/hooks/use-url-filters/use-url-filters'
import { EventListFigure } from '@/shared/ui/data-display/empty-figures/schedule-figures'
import { EmptyState } from '@/shared/ui/data-display/empty-state'
import { Checkbox } from '@/shared/ui/forms/checkbox'
import { Label } from '@/shared/ui/forms/label'
import { ListPane, ThreePane } from '@/shared/ui/layout/three-pane/three-pane'
import { Pagination } from '@/shared/ui/navigation/pagination'
import { Segmented } from '@/shared/ui/navigation/segmented'
import { Button } from '@/shared/ui/primitives/button'
import { QueryBoundary, SkeletonRows } from '@/shared/ui/states'

const MY_STATES = ['', 'UPCOMING', 'ACTIVE', 'FINISHED'] as const

type MyState = (typeof MY_STATES)[number]

function asState(value: string): MyState {
  return MY_STATES.includes(value as MyState) ? (value as MyState) : ''
}

const DEFAULTS = { archived: '', state: '', selected: '' }

export function MyEventsPage() {
  const { t } = useTranslation('event')
  const [filters, setFilters] = useUrlFilters(DEFAULTS)
  const [page, setPage] = usePageParam()
  const includeArchived = filters.archived === '1'
  const state = asState(filters.state)

  const query = useQuery(
    myEventsQuery({
      include_archived: includeArchived,
      ...(state === '' ? {} : { state }),
      page,
    }),
  )
  const items = query.data?.items ?? []
  const filtered = filters.state !== '' || includeArchived

  function resetFilters() {
    setFilters({ state: undefined, archived: undefined })
  }

  const selected = filters.selected || null
  const { openEventCard } = useEventOverlay()

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
          <Segmented
            label={t('list.stateAria')}
            value={state}
            onChange={(value) => setFilters({ state: value || undefined })}
            options={MY_STATES.map((value) => ({
              value,
              label: value === '' ? t('list.allStates') : t(EVENT_STATE_KEY[value]),
            }))}
          />

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
            <div className="flex min-h-0 min-w-0 flex-1 flex-col p-4">
              <EmptyState
                title={filtered ? t('list.myEmptyFiltered') : t('list.myEmpty')}
                figure={EventListFigure}
                filtered={filtered}
                onReset={resetFilters}
                action={
                  <Button asChild variant="outline">
                    <Link to="/catalog">{t('common:action.browseCatalog')}</Link>
                  </Button>
                }
              />
            </div>
          ) : (
            <>
              <div role="listbox" aria-label={t('list.myTitle')} className="flex flex-col">
                {items.map((item) => (
                  <EventRow
                    key={item.id}
                    event={item}
                    selected={item.id === selected}
                    onSelect={(id) => {
                      setFilters({ selected: id }, { resetPage: false })
                      openEventCard(id)
                    }}
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

      <AssignedEventOverlay />
    </ThreePane>
  )
}
