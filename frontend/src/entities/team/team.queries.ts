import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '@/shared/api/client'
import type { RequestBody } from '@/shared/api/params'
import type {
  TeamDetailResponse,
  TeamEventEntryListResponse,
  TeamEventEntryResponse,
  TeamJoinLinkResponse,
  TeamJoinLinkSecretResponse,
  TeamListResponse,
} from '@/shared/api/types.gen'

type CreateBody = RequestBody<'/teams', 'post'>
type RenameBody = RequestBody<'/teams/{id}', 'patch'>
type InviteBody = RequestBody<'/teams/{id}/invitations', 'post'>
type EnterBody = RequestBody<'/teams/{id}/events', 'post'>

export function teamsQuery() {
  return queryOptions<TeamListResponse>({
    queryKey: ['teams'],
    queryFn: () => unwrap(api.GET('/teams')),
  })
}

export function teamQuery(teamId: string) {
  return queryOptions<TeamDetailResponse>({
    queryKey: ['team', teamId],
    queryFn: () => unwrap(api.GET('/teams/{id}', { params: { path: { id: teamId } } })),
  })
}

export function teamEventsQuery(teamId: string) {
  return queryOptions<TeamEventEntryListResponse>({
    queryKey: ['team-events', teamId],
    queryFn: () => unwrap(api.GET('/teams/{id}/events', { params: { path: { id: teamId } } })),
  })
}

export function teamEventEntryQuery(teamId: string, eventId: string) {
  return queryOptions<TeamEventEntryResponse>({
    queryKey: ['team-event', teamId, eventId],
    queryFn: () =>
      unwrap(
        api.GET('/teams/{id}/events/{event_id}', {
          params: { path: { id: teamId, event_id: eventId } },
        }),
      ),
  })
}

function useInvalidateTeams() {
  const queryClient = useQueryClient()
  return (teamId?: string) => {
    queryClient.invalidateQueries({ queryKey: ['teams'] })
    if (teamId === undefined) return
    queryClient.invalidateQueries({ queryKey: ['team', teamId] })
    queryClient.invalidateQueries({ queryKey: ['team-events', teamId] })
    queryClient.invalidateQueries({ queryKey: ['team-event', teamId] })
  }
}

export function useCreateTeam() {
  const invalidate = useInvalidateTeams()
  return useMutation<TeamDetailResponse, Error, CreateBody>({
    mutationFn: (body) => unwrap(api.POST('/teams', { body })),
    onSuccess: (data) => invalidate(data.team.id),
  })
}

export function useRenameTeam(teamId: string) {
  const invalidate = useInvalidateTeams()
  return useMutation<TeamDetailResponse, Error, RenameBody>({
    mutationFn: (body) =>
      unwrap(api.PATCH('/teams/{id}', { params: { path: { id: teamId } }, body })),
    onSuccess: () => invalidate(teamId),
  })
}

export function useInviteTeamMember(teamId: string) {
  const invalidate = useInvalidateTeams()
  return useMutation<TeamDetailResponse, Error, InviteBody>({
    mutationFn: (body) =>
      unwrap(api.POST('/teams/{id}/invitations', { params: { path: { id: teamId } }, body })),
    onSuccess: () => invalidate(teamId),
  })
}

export function useAcceptTeamInvitation(teamId: string) {
  const invalidate = useInvalidateTeams()
  return useMutation<TeamDetailResponse, Error, void>({
    mutationFn: () =>
      unwrap(api.POST('/teams/{id}/membership', { params: { path: { id: teamId } } })),
    onSuccess: () => invalidate(teamId),
  })
}

export function useLeaveTeam(teamId: string) {
  const invalidate = useInvalidateTeams()
  return useMutation<unknown, Error, void>({
    mutationFn: () =>
      unwrap(api.DELETE('/teams/{id}/membership', { params: { path: { id: teamId } } })),
    onSuccess: () => invalidate(teamId),
  })
}

export function useRemoveTeamMember(teamId: string) {
  const invalidate = useInvalidateTeams()
  return useMutation<TeamDetailResponse, Error, { userId: string }>({
    mutationFn: ({ userId }) =>
      unwrap(
        api.DELETE('/teams/{id}/members/{user_id}', {
          params: { path: { id: teamId, user_id: userId } },
        }),
      ),
    onSuccess: () => invalidate(teamId),
  })
}

export function useEnterEvent(teamId: string) {
  const invalidate = useInvalidateTeams()
  return useMutation<TeamEventEntryResponse, Error, EnterBody>({
    mutationFn: (body) =>
      unwrap(api.POST('/teams/{id}/events', { params: { path: { id: teamId } }, body })),
    onSuccess: () => invalidate(teamId),
  })
}

export function useRosterMember(teamId: string) {
  const invalidate = useInvalidateTeams()
  return useMutation<
    TeamEventEntryResponse,
    Error,
    { eventId: string; userId: string; action: 'add' | 'remove' | 'mark' }
  >({
    mutationFn: ({ eventId, userId, action }) => {
      const path = { id: teamId, event_id: eventId, user_id: userId }
      if (action === 'add') {
        return unwrap(
          api.PUT('/teams/{id}/events/{event_id}/roster/{user_id}', { params: { path } }),
        )
      }
      if (action === 'remove') {
        return unwrap(
          api.DELETE('/teams/{id}/events/{event_id}/roster/{user_id}', { params: { path } }),
        )
      }
      return unwrap(
        api.POST('/teams/{id}/events/{event_id}/roster/{user_id}/registration/done', {
          params: { path },
        }),
      )
    },
    onSuccess: () => invalidate(teamId),
  })
}

export function teamJoinLinkQuery(teamId: string, enabled: boolean) {
  return queryOptions<TeamJoinLinkResponse>({
    queryKey: ['team-join-link', teamId],
    queryFn: () => unwrap(api.GET('/teams/{id}/join-link', { params: { path: { id: teamId } } })),
    enabled,
  })
}

export function useRotateJoinLink(teamId: string) {
  const queryClient = useQueryClient()
  return useMutation<TeamJoinLinkSecretResponse, Error, void>({
    mutationFn: () =>
      unwrap(api.POST('/teams/{id}/join-link', { params: { path: { id: teamId } } })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team-join-link', teamId] }),
  })
}

export function useRevokeJoinLink(teamId: string) {
  const queryClient = useQueryClient()
  return useMutation<unknown, Error, void>({
    mutationFn: () =>
      unwrap(api.DELETE('/teams/{id}/join-link', { params: { path: { id: teamId } } })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team-join-link', teamId] }),
  })
}

export function useJoinByLink() {
  const queryClient = useQueryClient()
  return useMutation<TeamDetailResponse, Error, { token: string }>({
    mutationFn: ({ token }) =>
      unwrap(api.POST('/team-join/{token}', { params: { path: { token } } })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teams'] }),
  })
}
