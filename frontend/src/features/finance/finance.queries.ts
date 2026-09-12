import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { eventKeys } from '@/entities/event/event.queries'
import { api, unwrap } from '@/shared/api/client'
import type { RequestBody } from '@/shared/api/params'
import type { EventCaseResponse } from '@/shared/api/types.gen'

export type CreateCasePayload = RequestBody<'/admin/events/{id}/cases', 'post'>
export type UpdateCasePayload = RequestBody<'/admin/cases/{id}', 'patch'>

export const financeKeys = {
  summary: (id: string) => ['event-finance', id] as const,
  cases: (id: string) => ['event-cases', id] as const,
}

export function eventFinanceQuery(id: string) {
  return queryOptions({
    queryKey: financeKeys.summary(id),
    queryFn: () => unwrap(api.GET('/events/{id}/finance', { params: { path: { id } } })),
  })
}

export function eventCasesQuery(id: string) {
  return queryOptions({
    queryKey: financeKeys.cases(id),
    queryFn: () => unwrap(api.GET('/events/{id}/cases', { params: { path: { id } } })),
  })
}

function useInvalidateFinance(eventId: string) {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: financeKeys.summary(eventId) })
    queryClient.invalidateQueries({ queryKey: financeKeys.cases(eventId) })
    queryClient.invalidateQueries({ queryKey: eventKeys.card(eventId) })
  }
}

export function useCreateCase(eventId: string) {
  const invalidate = useInvalidateFinance(eventId)
  return useMutation<EventCaseResponse, Error, CreateCasePayload>({
    mutationFn: (body) =>
      unwrap(api.POST('/admin/events/{id}/cases', { params: { path: { id: eventId } }, body })),
    onSuccess: invalidate,
  })
}

export function useUpdateCase(eventId: string) {
  const invalidate = useInvalidateFinance(eventId)
  return useMutation<EventCaseResponse, Error, { id: string; body: UpdateCasePayload }>({
    mutationFn: ({ id, body }) =>
      unwrap(api.PATCH('/admin/cases/{id}', { params: { path: { id } }, body })),
    onSuccess: invalidate,
  })
}

export function useDeleteCase(eventId: string) {
  const invalidate = useInvalidateFinance(eventId)
  return useMutation<unknown, Error, string>({
    mutationFn: (id) => unwrap(api.DELETE('/admin/cases/{id}', { params: { path: { id } } })),
    onSuccess: invalidate,
  })
}
