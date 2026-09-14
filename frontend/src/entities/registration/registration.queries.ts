import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '@/shared/api/client'
import type { RequestBody } from '@/shared/api/params'
import type { BatchResult, PreviewResponse, RegistrationResponse } from '@/shared/api/types.gen'

export type CreateRegistrationPayload = RequestBody<'/admin/events/{id}/registration', 'post'>
export type UpdateRegistrationPayload = RequestBody<'/admin/events/{id}/registration', 'patch'>
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
