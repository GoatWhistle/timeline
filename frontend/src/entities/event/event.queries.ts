import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '@/shared/api/client'
import type { QueryParams } from '@/shared/api/params'
import type {
  CreateEventRequest,
  EventResponse,
  RegistrationStatusResponse,
  UpdateEventRequest,
} from '@/shared/api/types.gen'

export const eventKeys = {
  card: (id: string) => ['event-card', id] as const,
  adminList: (params: Record<string, unknown>) => ['admin-events', params] as const,
  adminOne: (id: string) => ['admin-event', id] as const,
  tracks: (id: string) => ['event-tracks', id] as const,
}

export function eventCardQuery(id: string) {
  return queryOptions({
    queryKey: eventKeys.card(id),
    queryFn: () => unwrap(api.GET('/events/{id}', { params: { path: { id } } })),
  })
}

export function eventTracksQuery(id: string) {
  return queryOptions({
    queryKey: eventKeys.tracks(id),
    queryFn: () => unwrap(api.GET('/events/{id}/tracks', { params: { path: { id } } })),
  })
}

export function useMarkRegistrationDone(eventId: string) {
  const queryClient = useQueryClient()
  return useMutation<RegistrationStatusResponse, Error, void>({
    mutationFn: () =>
      unwrap(
        api.POST('/events/{id}/registration/done', {
          params: { path: { id: eventId } },
        }),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventKeys.card(eventId) })
      queryClient.invalidateQueries({ queryKey: ['my-events'] })
    },
  })
}

export type AdminListParams = QueryParams<'/admin/events', 'get'>

export function adminEventsQuery(params: AdminListParams) {
  return queryOptions({
    queryKey: eventKeys.adminList(params),
    queryFn: () => unwrap(api.GET('/admin/events', { params: { query: params } })),
  })
}

export function adminEventQuery(id: string) {
  return queryOptions({
    queryKey: eventKeys.adminOne(id),
    queryFn: () => unwrap(api.GET('/admin/events/{id}', { params: { path: { id } } })),
  })
}

export function useCreateEvent() {
  const queryClient = useQueryClient()
  return useMutation<EventResponse, Error, CreateEventRequest>({
    mutationFn: (body) => unwrap(api.POST('/admin/events', { body })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-events'] }),
  })
}

export function useUpdateEvent(id: string) {
  const queryClient = useQueryClient()
  return useMutation<EventResponse, Error, UpdateEventRequest>({
    mutationFn: (body) =>
      unwrap(api.PATCH('/admin/events/{id}', { params: { path: { id } }, body })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventKeys.adminOne(id) })
      queryClient.invalidateQueries({ queryKey: ['admin-events'] })
    },
  })
}

export function usePublishEvent(id: string) {
  const queryClient = useQueryClient()
  return useMutation<EventResponse, Error, void>({
    mutationFn: () => unwrap(api.POST('/admin/events/{id}/publish', { params: { path: { id } } })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventKeys.adminOne(id) })
      queryClient.invalidateQueries({ queryKey: ['admin-events'] })
    },
  })
}

export function useArchiveEvent(id: string) {
  const queryClient = useQueryClient()
  return useMutation<EventResponse, Error, void>({
    mutationFn: () => unwrap(api.POST('/admin/events/{id}/archive', { params: { path: { id } } })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventKeys.adminOne(id) })
      queryClient.invalidateQueries({ queryKey: ['admin-events'] })
    },
  })
}

export function useModerateEvent() {
  const queryClient = useQueryClient()
  return useMutation<EventResponse, Error, { id: string; action: 'publish' | 'archive' }>({
    mutationFn: ({ id, action }) =>
      unwrap(
        action === 'publish'
          ? api.POST('/admin/events/{id}/publish', { params: { path: { id } } })
          : api.POST('/admin/events/{id}/archive', { params: { path: { id } } }),
      ),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: eventKeys.adminOne(id) })
      queryClient.invalidateQueries({ queryKey: ['admin-events'] })
      queryClient.invalidateQueries({ queryKey: ['event-state-counts'] })
    },
  })
}

export function organizerSuggestionsQuery(search: string) {
  return queryOptions({
    queryKey: ['organizer-suggestions', search],
    queryFn: () => unwrap(api.GET('/organizers', { params: { query: { search } } })),
    staleTime: 60_000,
  })
}
