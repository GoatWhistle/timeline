import { useQuery } from '@tanstack/react-query'
import { Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { catalogEventQuery } from '@/entities/catalog/catalog.queries'
import { EventSummary, fromCatalogEvent } from '@/features/event-overlay-card'
import { PageHeader } from '@/shared/ui/layout/page-header'
import { PAGE_WIDTH } from '@/shared/ui/layout/page-width'
import { Button } from '@/shared/ui/primitives/button'
import { QueryBoundary, SkeletonDetail } from '@/shared/ui/states'

export function CatalogEventView({ id }: { id: string }) {
  const { t } = useTranslation('event')
  const query = useQuery(catalogEventQuery(id))
  const event = query.data

  return (
    <QueryBoundary
      isPending={query.isPending}
      isFetching={query.isFetching}
      isError={query.isError}
      error={query.error}
      onRetry={() => query.refetch()}
      hasData={event !== undefined}
      skeleton={<SkeletonDetail />}
    >
      {event && (
        <div className={PAGE_WIDTH} data-catalog-event-view="">
          <PageHeader title={event.title} />
          <div className="pr-2.5">
            <EventSummary
              card={fromCatalogEvent(event)}
              coverClassName="aspect-[16/9] sm:aspect-[3/1] xl:aspect-[4/1]"
            />
            <div className="mt-6 flex flex-wrap items-center justify-end gap-3 border-border border-t pt-4">
              <p className="min-w-0 flex-1 text-caption text-muted-foreground">
                {t('card.joinThroughTeam')}
              </p>
              <Button asChild variant="outline">
                <Link to="/teams">
                  <Users className="size-4" aria-hidden="true" />
                  {t('card.toTeams')}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </QueryBoundary>
  )
}
