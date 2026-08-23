import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '@/shared/api/client'
import type { RequestBody } from '@/shared/api/params'
import type {
  BatchResult,
  NotificationRuleResponse,
  PreviewResponse,
  RegistrationResponse,
  RegistrationStatusResponse,
} from '@/shared/api/types.gen'

export type CreateRegistrationPayload = RequestBody<'/admin/hackathons/{id}/registration', 'post'>
export type UpdateRegistrationPayload = RequestBody<'/admin/hackathons/{id}/registration', 'patch'>
export type CreateRulePayload = RequestBody<'/admin/hackathons/{id}/registration/rules', 'post'>
export type UpdateRulePayload = RequestBody<'/admin/registration-rules/{id}', 'patch'>
export type BatchSetStatusPayload = RequestBody<
  '/admin/hackathons/{id}/registration-statuses/batch-set',
  'post'
>

export function registrationQuery(hackathonId: string) {
  return queryOptions({
    queryKey: ['registration', hackathonId],
    queryFn: () =>
      unwrap(
        api.GET('/admin/hackathons/{id}/registration', { params: { path: { id: hackathonId } } }),
      ),
    retry: false,
  })
}

export function rulesQuery(hackathonId: string) {
  return queryOptions({
    queryKey: ['rules', hackathonId],
    queryFn: () =>
      unwrap(
        api.GET('/admin/hackathons/{id}/registration/rules', {
          params: { path: { id: hackathonId } },
        }),
      ),
    retry: false,
  })
}

export function statusesQuery(hackathonId: string, page: number) {
  return queryOptions({
    queryKey: ['registration-statuses', hackathonId, page],
    queryFn: () =>
      unwrap(
        api.GET('/admin/hackathons/{id}/registration-statuses', {
          params: { path: { id: hackathonId }, query: { page } },
        }),
      ),
  })
}

function useInvalidateRegistration(hackathonId: string) {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: ['registration', hackathonId] })
    queryClient.invalidateQueries({ queryKey: ['rules', hackathonId] })
    queryClient.invalidateQueries({ queryKey: ['registration-statuses', hackathonId] })
    queryClient.invalidateQueries({ queryKey: ['participants', hackathonId] })
  }
}

export function useCreateRegistration(hackathonId: string) {
  const invalidate = useInvalidateRegistration(hackathonId)
  return useMutation<RegistrationResponse, Error, CreateRegistrationPayload>({
    mutationFn: (body) =>
      unwrap(
        api.POST('/admin/hackathons/{id}/registration', {
          params: { path: { id: hackathonId } },
          body,
        }),
      ),
    onSuccess: invalidate,
  })
}

export function useUpdateRegistration(hackathonId: string) {
  const invalidate = useInvalidateRegistration(hackathonId)
  return useMutation<RegistrationResponse, Error, UpdateRegistrationPayload>({
    mutationFn: (body) =>
      unwrap(
        api.PATCH('/admin/hackathons/{id}/registration', {
          params: { path: { id: hackathonId } },
          body,
        }),
      ),
    onSuccess: invalidate,
  })
}

export function useToggleRegistration(hackathonId: string) {
  const invalidate = useInvalidateRegistration(hackathonId)
  return useMutation<RegistrationResponse, Error, 'enable' | 'disable'>({
    mutationFn: (action) =>
      action === 'enable'
        ? unwrap(
            api.POST('/admin/hackathons/{id}/registration/enable', {
              params: { path: { id: hackathonId } },
            }),
          )
        : unwrap(
            api.POST('/admin/hackathons/{id}/registration/disable', {
              params: { path: { id: hackathonId } },
            }),
          ),
    onSuccess: invalidate,
  })
}

export function useCreateRule(hackathonId: string) {
  const invalidate = useInvalidateRegistration(hackathonId)
  return useMutation<NotificationRuleResponse, Error, CreateRulePayload>({
    mutationFn: (body) =>
      unwrap(
        api.POST('/admin/hackathons/{id}/registration/rules', {
          params: { path: { id: hackathonId } },
          body,
        }),
      ),
    onSuccess: invalidate,
  })
}

export function useUpdateRule(hackathonId: string) {
  const invalidate = useInvalidateRegistration(hackathonId)
  return useMutation<NotificationRuleResponse, Error, { id: string; body: UpdateRulePayload }>({
    mutationFn: ({ id, body }) =>
      unwrap(api.PATCH('/admin/registration-rules/{id}', { params: { path: { id } }, body })),
    onSuccess: invalidate,
  })
}

export function useDisableRule(hackathonId: string) {
  const invalidate = useInvalidateRegistration(hackathonId)
  return useMutation<unknown, Error, string>({
    mutationFn: (id) =>
      unwrap(api.DELETE('/admin/registration-rules/{id}', { params: { path: { id } } })),
    onSuccess: invalidate,
  })
}

export function useChangeStatus(hackathonId: string) {
  const invalidate = useInvalidateRegistration(hackathonId)
  return useMutation<
    RegistrationStatusResponse,
    Error,
    { id: string; body: RequestBody<'/admin/registration-statuses/{id}', 'patch'> }
  >({
    mutationFn: ({ id, body }) =>
      unwrap(api.PATCH('/admin/registration-statuses/{id}', { params: { path: { id } }, body })),
    onSuccess: invalidate,
  })
}

export function usePreviewBatchStatus(hackathonId: string) {
  return useMutation<PreviewResponse, Error, BatchSetStatusPayload>({
    mutationFn: (body) =>
      unwrap(
        api.POST('/admin/hackathons/{id}/registration-statuses/batch-set/preview', {
          params: { path: { id: hackathonId } },
          body,
        }),
      ),
  })
}

export function useBatchSetStatus(hackathonId: string) {
  const invalidate = useInvalidateRegistration(hackathonId)
  return useMutation<BatchResult, Error, BatchSetStatusPayload>({
    mutationFn: (body) =>
      unwrap(
        api.POST('/admin/hackathons/{id}/registration-statuses/batch-set', {
          params: { path: { id: hackathonId } },
          body,
        }),
      ),
    onSuccess: invalidate,
  })
}
