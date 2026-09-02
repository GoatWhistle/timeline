import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { historyQuery } from '@/entities/personal/history.queries'
import { HistoryFigure } from '@/shared/ui/data-display/empty-figures/personal-figures'
import { EmptyState } from '@/shared/ui/data-display/empty-state'
import { PageHeader } from '@/shared/ui/layout/page-header'
import { Pagination } from '@/shared/ui/navigation/pagination'
import { Button } from '@/shared/ui/primitives/button'
import { QueryBoundary, SkeletonRows } from '@/shared/ui/states'
import { HistoryRow } from './history-row'

export function HistoryPage() {
  const { t } = useTranslation('event')
  const [page, setPage] = useState(1)
  const query = useQuery(historyQuery({ page, page_size: 20 }))

  const items = query.data?.items ?? []

  return (
    <div className="max-w-4xl">
      <PageHeader
        title={t('personal.history.title')}
        description={t('personal.history.subtitle')}
      />

      <QueryBoundary
        isPending={query.isPending}
        isFetching={query.isFetching}
        isError={query.isError}
        error={query.error}
        onRetry={() => query.refetch()}
        hasData={query.data !== undefined}
        skeleton={<SkeletonRows rows={5} />}
      >
        {items.length === 0 ? (
          <EmptyState
            title={t('personal.history.empty')}
            description={t('personal.history.emptyHint')}
            figure={HistoryFigure}
            action={
              <Button asChild variant="outline">
                <Link to="/catalog">{t('common:action.browseCatalog')}</Link>
              </Button>
            }
          />
        ) : (
          <div className="flex flex-col gap-4">
            <ul className="flex flex-col gap-3">
              {items.map((item) => (
                <HistoryRow key={item.event_id} item={item} />
              ))}
            </ul>
            <Pagination meta={query.data?.meta} onPageChange={setPage} />
          </div>
        )}
      </QueryBoundary>
    </div>
  )
}
