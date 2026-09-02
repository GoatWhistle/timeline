import type { ReactNode } from 'react'
import type { CatalogEvent } from '@/shared/api/types.gen'
import { EventOverlayCard } from './event-overlay-card'
import { useAdminOverlay, useAssignedOverlay, useCatalogOverlay } from './overlay-resolvers'
import { useEventOverlay } from './use-event-overlay'

export function AssignedEventOverlay() {
  const { eventId } = useEventOverlay()
  const result = useAssignedOverlay(eventId)
  return <EventOverlayCard result={result} />
}

export function AdminEventOverlay() {
  const { eventId } = useEventOverlay()
  const result = useAdminOverlay(eventId)
  return <EventOverlayCard result={result} />
}

export function CatalogEventOverlay({
  items,
  actions,
}: {
  items: readonly CatalogEvent[]
  actions?: (event: CatalogEvent) => ReactNode
}) {
  const { eventId } = useEventOverlay()
  const result = useCatalogOverlay(eventId, items)
  const match = items.find((item) => item.id === eventId) ?? null
  return (
    <EventOverlayCard result={result} actions={match && actions ? actions(match) : undefined} />
  )
}
