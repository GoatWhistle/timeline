import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '@/shared/api/client'
import type { RequestBody } from '@/shared/api/params'
import type { ParticipantLink, ResourceLink } from '@/shared/api/types.gen'

export type CreateLinkPayload = RequestBody<'/events/{id}/links', 'post'>
export type UpdateLinkPayload = RequestBody<'/events/{id}/links/{linkId}', 'patch'>
export type CreatePersonalLinkPayload = RequestBody<'/me/events/{id}/links', 'post'>
export type UpdatePersonalLinkPayload = RequestBody<'/me/links/{id}', 'patch'>

export function eventLinksQuery(eventId: string) {
  return queryOptions({
    queryKey: ['links', eventId],
    queryFn: () => unwrap(api.GET('/events/{id}/links', { params: { path: { id: eventId } } })),
  })
}

export function personalLinksQuery(eventId: string) {
  return queryOptions({
    queryKey: ['links', 'me', eventId],
    queryFn: () => unwrap(api.GET('/me/events/{id}/links', { params: { path: { id: eventId } } })),
  })
}

export function useCreateLink(eventId: string) {
  const queryClient = useQueryClient()
  return useMutation<ResourceLink, Error, CreateLinkPayload>({
    mutationFn: (body) =>
      unwrap(api.POST('/events/{id}/links', { params: { path: { id: eventId } }, body })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['links', eventId] }),
  })
}

export function useUpdateLink(eventId: string) {
  const queryClient = useQueryClient()
  return useMutation<ResourceLink, Error, { id: string; body: UpdateLinkPayload }>({
    mutationFn: ({ id, body }) =>
      unwrap(
        api.PATCH('/events/{id}/links/{linkId}', {
          params: { path: { id: eventId, linkId: id } },
          body,
        }),
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['links', eventId] }),
  })
}

export function useDeleteLink(eventId: string) {
  const queryClient = useQueryClient()
  return useMutation<unknown, Error, string>({
    mutationFn: (id) =>
      unwrap(
        api.DELETE('/events/{id}/links/{linkId}', {
          params: { path: { id: eventId, linkId: id } },
        }),
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['links', eventId] }),
  })
}

export function useCreatePersonalLink(eventId: string) {
  const queryClient = useQueryClient()
  return useMutation<ParticipantLink, Error, CreatePersonalLinkPayload>({
    mutationFn: (body) =>
      unwrap(api.POST('/me/events/{id}/links', { params: { path: { id: eventId } }, body })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['links', 'me', eventId] }),
  })
}

export function useUpdatePersonalLink(eventId: string) {
  const queryClient = useQueryClient()
  return useMutation<ParticipantLink, Error, { id: string; body: UpdatePersonalLinkPayload }>({
    mutationFn: ({ id, body }) =>
      unwrap(api.PATCH('/me/links/{id}', { params: { path: { id } }, body })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['links', 'me', eventId] }),
  })
}

export function useDeletePersonalLink(eventId: string) {
  const queryClient = useQueryClient()
  return useMutation<unknown, Error, string>({
    mutationFn: (id) => unwrap(api.DELETE('/me/links/{id}', { params: { path: { id } } })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['links', 'me', eventId] }),
  })
}
