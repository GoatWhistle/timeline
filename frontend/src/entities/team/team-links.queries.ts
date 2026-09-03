import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '@/shared/api/client'
import type {
  CreateTeamEventLinkRequest,
  TeamEventLinkListResponse,
  UpdateTeamEventLinkRequest,
} from '@/shared/api/types.gen'

export function teamEventLinksQueryKey(teamId: string, eventId: string) {
  return ['team-event-links', teamId, eventId] as const
}

export function teamEventLinksQuery(teamId: string, eventId: string) {
  return queryOptions<TeamEventLinkListResponse>({
    queryKey: teamEventLinksQueryKey(teamId, eventId),
    queryFn: () =>
      unwrap(
        api.GET('/teams/{id}/events/{event_id}/links', {
          params: { path: { id: teamId, event_id: eventId } },
        }),
      ),
  })
}

function useTeamEventLinksMutation<TVariables>(
  teamId: string,
  eventId: string,
  run: (variables: TVariables) => Promise<unknown>,
) {
  const queryClient = useQueryClient()
  return useMutation<unknown, Error, TVariables>({
    mutationFn: run,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: teamEventLinksQueryKey(teamId, eventId) }),
  })
}

export function useAddTeamEventLink(teamId: string, eventId: string) {
  return useTeamEventLinksMutation<CreateTeamEventLinkRequest>(teamId, eventId, (body) =>
    unwrap(
      api.POST('/teams/{id}/events/{event_id}/links', {
        params: { path: { id: teamId, event_id: eventId } },
        body,
      }),
    ),
  )
}

export function useUpdateTeamEventLink(teamId: string, eventId: string) {
  return useTeamEventLinksMutation<{ id: string; body: UpdateTeamEventLinkRequest }>(
    teamId,
    eventId,
    ({ id, body }) => unwrap(api.PATCH('/team-links/{id}', { params: { path: { id } }, body })),
  )
}

export function useRemoveTeamEventLink(teamId: string, eventId: string) {
  return useTeamEventLinksMutation<string>(teamId, eventId, (id) =>
    unwrap(api.DELETE('/team-links/{id}', { params: { path: { id } } })),
  )
}

export function useReorderTeamEventLinks(teamId: string, eventId: string) {
  return useTeamEventLinksMutation<string[]>(teamId, eventId, (ids) =>
    unwrap(
      api.PUT('/teams/{id}/events/{event_id}/links/order', {
        params: { path: { id: teamId, event_id: eventId } },
        body: { ids },
      }),
    ),
  )
}
