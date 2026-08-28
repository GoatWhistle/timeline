import { useQuery } from '@tanstack/react-query'
import { Copy } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { adminEventQuery } from '@/entities/event/event.queries'
import { registrationQuery } from '@/entities/registration/registration.queries'
import { CloneEventDialog } from '@/features/event-clone/clone-event-dialog'
import { ErrorState } from '@/shared/ui/data-display/error-state'
import { Button } from '@/shared/ui/primitives/button'
import { SkeletonDetail, useLoadingIndicator } from '@/shared/ui/states'
import { EventDetailView } from './event-detail-view'

export function AdminDetailPane({ id, onClose }: { id: string; onClose: () => void }) {
  const { t } = useTranslation('event')
  const event = useQuery(adminEventQuery(id))
  const registration = useQuery({ ...registrationQuery(id), retry: false })
  const [cloneOpen, setCloneOpen] = useState(false)
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
      >
        <Button variant="outline" size="sm" onClick={() => setCloneOpen(true)}>
          <Copy className="size-4" aria-hidden="true" />
          {t('clone.action')}
        </Button>
      </EventDetailView>

      {cloneOpen && (
        <CloneEventDialog event={event.data} open={cloneOpen} onOpenChange={setCloneOpen} />
      )}
    </div>
  )
}
