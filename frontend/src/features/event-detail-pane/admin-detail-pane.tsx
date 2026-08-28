import { useQuery } from '@tanstack/react-query'
import { adminEventQuery } from '@/entities/event/event.queries'
import { registrationQuery } from '@/entities/registration/registration.queries'
import { ErrorState } from '@/shared/ui/data-display/error-state'
import { SkeletonDetail, useLoadingIndicator } from '@/shared/ui/states'
import { EventDetailView } from './event-detail-view'

export function AdminDetailPane({ id, onClose }: { id: string; onClose: () => void }) {
  const event = useQuery(adminEventQuery(id))
  const registration = useQuery({ ...registrationQuery(id), retry: false })
  const indicator = useLoadingIndicator({
    isPending: event.isPending,
    isFetching: event.isFetching,
    hasData: event.data !== undefined,
  })

  if (event.isError) return <ErrorState error={event.error} onRetry={() => event.refetch()} />
  if (!event.data) return indicator === 'skeleton' ? <SkeletonDetail /> : null

  return (
    <div className={indicator === 'stale' ? 'opacity-60 transition-opacity duration-fast' : ''}>
      <EventDetailView
        event={event.data}
        registration={registration.data ?? null}
        detailPath={`/admin/events/${id}`}
        onClose={onClose}
      />
    </div>
  )
}
