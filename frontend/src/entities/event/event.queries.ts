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
  mine: (params: Record<string, unknown>) => ['my-events', params] as const,
  card: (id: string) => ['event-card', id] as const,
  adminList: (params: Record<string, unknown>) => ['admin-events', params] as const,
  adminOne: (id: string) => ['admin-event', id] as const,
}

export type MyEventsParams = QueryParams<'/me/events', 'get'>

export function myEventsQuery(params: MyEventsParams) {
  return queryOptions({
    queryKey: eventKeys.mine(params),
    queryFn: () => unwrap(api.GET('/me/events', { params: { query: params } })),
  })
}

export function eventCardQuery(id: string) {
  return queryOptions({
    queryKey: eventKeys.card(id),
    queryFn: () => unwrap(api.GET('/events/{id}', { params: { path: { id } } })),
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
