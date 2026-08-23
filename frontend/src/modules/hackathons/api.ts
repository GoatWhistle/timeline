import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '@/shared/api/client'
import type { QueryParams } from '@/shared/api/params'
import type {
  CreateHackathonRequest,
  HackathonResponse,
  RegistrationStatusResponse,
  UpdateHackathonRequest,
} from '@/shared/api/types.gen'

export const hackathonKeys = {
  mine: (params: Record<string, unknown>) => ['my-hackathons', params] as const,
  card: (id: string) => ['hackathon-card', id] as const,
  adminList: (params: Record<string, unknown>) => ['admin-hackathons', params] as const,
  adminOne: (id: string) => ['admin-hackathon', id] as const,
}

export type MyHackathonsParams = QueryParams<'/me/hackathons', 'get'>

export function myHackathonsQuery(params: MyHackathonsParams) {
  return queryOptions({
    queryKey: hackathonKeys.mine(params),
    queryFn: () => unwrap(api.GET('/me/hackathons', { params: { query: params } })),
  })
}

export function hackathonCardQuery(id: string) {
  return queryOptions({
    queryKey: hackathonKeys.card(id),
    queryFn: () => unwrap(api.GET('/hackathons/{id}', { params: { path: { id } } })),
  })
}

export function useMarkRegistrationDone(hackathonId: string) {
  const queryClient = useQueryClient()
  return useMutation<RegistrationStatusResponse, Error, void>({
    mutationFn: () =>
      unwrap(
        api.POST('/hackathons/{id}/registration/done', {
          params: { path: { id: hackathonId } },
        }),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hackathonKeys.card(hackathonId) })
      queryClient.invalidateQueries({ queryKey: ['my-hackathons'] })
    },
  })
}

export type AdminListParams = QueryParams<'/admin/hackathons', 'get'>

export function adminHackathonsQuery(params: AdminListParams) {
  return queryOptions({
    queryKey: hackathonKeys.adminList(params),
    queryFn: () => unwrap(api.GET('/admin/hackathons', { params: { query: params } })),
  })
}

export function adminHackathonQuery(id: string) {
  return queryOptions({
    queryKey: hackathonKeys.adminOne(id),
    queryFn: () => unwrap(api.GET('/admin/hackathons/{id}', { params: { path: { id } } })),
  })
}

export function useCreateHackathon() {
  const queryClient = useQueryClient()
  return useMutation<HackathonResponse, Error, CreateHackathonRequest>({
    mutationFn: (body) => unwrap(api.POST('/admin/hackathons', { body })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-hackathons'] }),
  })
}

export function useUpdateHackathon(id: string) {
  const queryClient = useQueryClient()
  return useMutation<HackathonResponse, Error, UpdateHackathonRequest>({
    mutationFn: (body) =>
      unwrap(api.PATCH('/admin/hackathons/{id}', { params: { path: { id } }, body })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hackathonKeys.adminOne(id) })
      queryClient.invalidateQueries({ queryKey: ['admin-hackathons'] })
    },
  })
}

export function usePublishHackathon(id: string) {
  const queryClient = useQueryClient()
  return useMutation<HackathonResponse, Error, void>({
    mutationFn: () =>
      unwrap(api.POST('/admin/hackathons/{id}/publish', { params: { path: { id } } })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hackathonKeys.adminOne(id) })
      queryClient.invalidateQueries({ queryKey: ['admin-hackathons'] })
    },
  })
}

export function useArchiveHackathon(id: string) {
  const queryClient = useQueryClient()
  return useMutation<HackathonResponse, Error, void>({
    mutationFn: () =>
      unwrap(api.POST('/admin/hackathons/{id}/archive', { params: { path: { id } } })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hackathonKeys.adminOne(id) })
      queryClient.invalidateQueries({ queryKey: ['admin-hackathons'] })
    },
  })
}
