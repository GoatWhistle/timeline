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

export function CatalogEventOverlay({ items }: { items: readonly CatalogEvent[] }) {
  const { eventId } = useEventOverlay()
  const result = useCatalogOverlay(eventId, items)
  return <EventOverlayCard result={result} />
}
