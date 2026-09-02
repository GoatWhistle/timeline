import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { adminEventQuery, eventCardQuery } from '@/entities/event/event.queries'
import { stagesQuery } from '@/entities/stage/stage.queries'
import type { CatalogEvent } from '@/shared/api/types.gen'
import { useLoadingIndicator } from '@/shared/ui/states'
import {
  fromCatalogEvent,
  fromEventCard,
  fromEventResponse,
  type OverlayCard,
} from './overlay-model'

export type OverlayResult = {
  card: OverlayCard | null
  loading: boolean
  stale: boolean
  error: unknown
  retry: () => void
}

export function useAssignedOverlay(id: string | null): OverlayResult {
  const query = useQuery({ ...eventCardQuery(id ?? ''), enabled: id !== null })
  const indicator = useLoadingIndicator({
    isPending: query.isPending,
    isFetching: query.isFetching,
    hasData: query.data !== undefined,
  })

  return {
    card: query.data ? fromEventCard(query.data) : null,
    loading: !query.data && indicator === 'skeleton',
    stale: indicator === 'stale',
    error: query.isError ? query.error : null,
    retry: () => {
      query.refetch()
    },
  }
}

export function useAdminOverlay(id: string | null): OverlayResult {
  const event = useQuery({ ...adminEventQuery(id ?? ''), enabled: id !== null })
  const stages = useQuery({ ...stagesQuery(id ?? ''), enabled: id !== null })
  const indicator = useLoadingIndicator({
    isPending: event.isPending,
    isFetching: event.isFetching,
    hasData: event.data !== undefined,
  })

  const card = useMemo(() => {
    if (!event.data) return null
    const base = fromEventResponse(event.data)
    return { ...base, stages: stages.data ?? base.stages }
  }, [event.data, stages.data])

  return {
    card,
    loading: !event.data && indicator === 'skeleton',
    stale: indicator === 'stale',
    error: event.isError ? event.error : null,
    retry: () => {
      event.refetch()
      stages.refetch()
    },
  }
}

export function useCatalogOverlay(
  id: string | null,
  items: readonly CatalogEvent[],
): OverlayResult {
  const card = useMemo(() => {
    if (id === null) return null
    const match = items.find((item) => item.id === id)
    return match ? fromCatalogEvent(match) : null
  }, [id, items])

  return { card, loading: false, stale: false, error: null, retry: () => {} }
}
