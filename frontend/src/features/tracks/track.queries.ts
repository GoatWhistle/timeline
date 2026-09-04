import { useMutation, useQueryClient } from '@tanstack/react-query'
import { eventKeys } from '@/entities/event/event.queries'
import { api, unwrap } from '@/shared/api/client'
import type { RequestBody } from '@/shared/api/params'
import type { EventTrackResponse, TeamEventEntryResponse } from '@/shared/api/types.gen'

export type CreateTrackPayload = RequestBody<'/admin/events/{id}/tracks', 'post'>
export type UpdateTrackPayload = RequestBody<'/admin/tracks/{id}', 'patch'>
export type ChooseTrackPayload = RequestBody<'/teams/{id}/events/{event_id}/track', 'put'>

function useInvalidateTracks(eventId: string) {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: eventKeys.tracks(eventId) })
    queryClient.invalidateQueries({ queryKey: eventKeys.card(eventId) })
    queryClient.invalidateQueries({ queryKey: eventKeys.adminOne(eventId) })
  }
}

export function useCreateTrack(eventId: string) {
  const invalidate = useInvalidateTracks(eventId)
  return useMutation<EventTrackResponse, Error, CreateTrackPayload>({
    mutationFn: (body) =>
      unwrap(api.POST('/admin/events/{id}/tracks', { params: { path: { id: eventId } }, body })),
    onSuccess: invalidate,
  })
}

export function useUpdateTrack(eventId: string) {
  const invalidate = useInvalidateTracks(eventId)
  return useMutation<EventTrackResponse, Error, { id: string; body: UpdateTrackPayload }>({
    mutationFn: ({ id, body }) =>
      unwrap(api.PATCH('/admin/tracks/{id}', { params: { path: { id } }, body })),
    onSuccess: invalidate,
  })
}

export function useDeleteTrack(eventId: string) {
  const invalidate = useInvalidateTracks(eventId)
  return useMutation<unknown, Error, string>({
    mutationFn: (id) => unwrap(api.DELETE('/admin/tracks/{id}', { params: { path: { id } } })),
    onSuccess: invalidate,
  })
}

export function useChooseTrack(teamId: string, eventId: string) {
  const queryClient = useQueryClient()
  return useMutation<TeamEventEntryResponse, Error, ChooseTrackPayload>({
    mutationFn: (body) =>
      unwrap(
        api.PUT('/teams/{id}/events/{event_id}/track', {
          params: { path: { id: teamId, event_id: eventId } },
          body,
        }),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-events', teamId] })
      queryClient.invalidateQueries({ queryKey: ['team-event', teamId] })
    },
  })
}
