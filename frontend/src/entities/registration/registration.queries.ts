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

export type CreateRegistrationPayload = RequestBody<'/admin/events/{id}/registration', 'post'>
export type UpdateRegistrationPayload = RequestBody<'/admin/events/{id}/registration', 'patch'>
export type CreateRulePayload = RequestBody<'/admin/events/{id}/registration/rules', 'post'>
export type UpdateRulePayload = RequestBody<'/admin/registration-rules/{id}', 'patch'>
export type BatchSetStatusPayload = RequestBody<
  '/admin/events/{id}/registration-statuses/batch-set',
  'post'
>

export function registrationQuery(eventId: string) {
  return queryOptions({
    queryKey: ['registration', eventId],
    queryFn: () =>
      unwrap(api.GET('/admin/events/{id}/registration', { params: { path: { id: eventId } } })),
    retry: false,
  })
}

export function rulesQuery(eventId: string) {
  return queryOptions({
    queryKey: ['rules', eventId],
    queryFn: () =>
      unwrap(
        api.GET('/admin/events/{id}/registration/rules', {
          params: { path: { id: eventId } },
        }),
      ),
    retry: false,
  })
}

export function statusesQuery(eventId: string, page: number) {
  return queryOptions({
    queryKey: ['registration-statuses', eventId, page],
    queryFn: () =>
      unwrap(
        api.GET('/admin/events/{id}/registration-statuses', {
          params: { path: { id: eventId }, query: { page } },
        }),
      ),
  })
}

function useInvalidateRegistration(eventId: string) {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: ['registration', eventId] })
    queryClient.invalidateQueries({ queryKey: ['rules', eventId] })
    queryClient.invalidateQueries({ queryKey: ['registration-statuses', eventId] })
    queryClient.invalidateQueries({ queryKey: ['participants', eventId] })
  }
}

export function useCreateRegistration(eventId: string) {
  const invalidate = useInvalidateRegistration(eventId)
  return useMutation<RegistrationResponse, Error, CreateRegistrationPayload>({
    mutationFn: (body) =>
      unwrap(
        api.POST('/admin/events/{id}/registration', {
          params: { path: { id: eventId } },
          body,
        }),
      ),
    onSuccess: invalidate,
  })
}

export function useUpdateRegistration(eventId: string) {
  const invalidate = useInvalidateRegistration(eventId)
  return useMutation<RegistrationResponse, Error, UpdateRegistrationPayload>({
    mutationFn: (body) =>
      unwrap(
        api.PATCH('/admin/events/{id}/registration', {
          params: { path: { id: eventId } },
          body,
        }),
      ),
    onSuccess: invalidate,
  })
}

export function useToggleRegistration(eventId: string) {
  const invalidate = useInvalidateRegistration(eventId)
  return useMutation<RegistrationResponse, Error, 'enable' | 'disable'>({
    mutationFn: (action) =>
      action === 'enable'
        ? unwrap(
            api.POST('/admin/events/{id}/registration/enable', {
              params: { path: { id: eventId } },
            }),
          )
        : unwrap(
            api.POST('/admin/events/{id}/registration/disable', {
              params: { path: { id: eventId } },
            }),
          ),
    onSuccess: invalidate,
  })
}

export function useCreateRule(eventId: string) {
  const invalidate = useInvalidateRegistration(eventId)
  return useMutation<NotificationRuleResponse, Error, CreateRulePayload>({
    mutationFn: (body) =>
      unwrap(
        api.POST('/admin/events/{id}/registration/rules', {
          params: { path: { id: eventId } },
          body,
        }),
      ),
    onSuccess: invalidate,
  })
}

export function useUpdateRule(eventId: string) {
  const invalidate = useInvalidateRegistration(eventId)
  return useMutation<NotificationRuleResponse, Error, { id: string; body: UpdateRulePayload }>({
    mutationFn: ({ id, body }) =>
      unwrap(api.PATCH('/admin/registration-rules/{id}', { params: { path: { id } }, body })),
    onSuccess: invalidate,
  })
}

export function useDisableRule(eventId: string) {
  const invalidate = useInvalidateRegistration(eventId)
  return useMutation<unknown, Error, string>({
    mutationFn: (id) =>
      unwrap(api.DELETE('/admin/registration-rules/{id}', { params: { path: { id } } })),
    onSuccess: invalidate,
  })
}

export function useChangeStatus(eventId: string) {
  const invalidate = useInvalidateRegistration(eventId)
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

export function usePreviewBatchStatus(eventId: string) {
  return useMutation<PreviewResponse, Error, BatchSetStatusPayload>({
    mutationFn: (body) =>
      unwrap(
        api.POST('/admin/events/{id}/registration-statuses/batch-set/preview', {
          params: { path: { id: eventId } },
          body,
        }),
      ),
  })
}

export function useBatchSetStatus(eventId: string) {
  const invalidate = useInvalidateRegistration(eventId)
  return useMutation<BatchResult, Error, BatchSetStatusPayload>({
    mutationFn: (body) =>
      unwrap(
        api.POST('/admin/events/{id}/registration-statuses/batch-set', {
          params: { path: { id: eventId } },
          body,
        }),
      ),
    onSuccess: invalidate,
  })
}
