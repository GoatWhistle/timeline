import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '@/shared/api/client'
import type {
  BatchResult,
  CreateTaskRequest,
  ParticipantTask,
  TemplateListResponse,
  UpdateTaskRequest,
} from '@/shared/api/types.gen'
import { personalKeys } from './personal.keys'
import { asAbsence, personalError } from './personal-absence'

const NO_TASKS: ParticipantTask[] = []

export function tasksQuery(eventId: string) {
  return queryOptions({
    queryKey: personalKeys.tasks(eventId),
    queryFn: async () => {
      try {
        const data = await unwrap(
          api.GET('/me/events/{id}/tasks', { params: { path: { id: eventId } } }),
        )
        return data.items
      } catch (error) {
        return asAbsence(personalError(error), NO_TASKS)
      }
    },
  })
}

export function templatesQuery() {
  return queryOptions({
    queryKey: personalKeys.templates(),
    queryFn: (): Promise<TemplateListResponse> => unwrap(api.GET('/me/checklist-templates')),
    staleTime: Number.POSITIVE_INFINITY,
  })
}

function useTaskInvalidate(eventId: string) {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: personalKeys.tasks(eventId) })
    queryClient.invalidateQueries({ queryKey: ['personal-history'] })
  }
}

export function useCreateTask(eventId: string) {
  const invalidate = useTaskInvalidate(eventId)
  return useMutation<ParticipantTask, Error, CreateTaskRequest>({
    mutationFn: (body) =>
      unwrap(api.POST('/me/events/{id}/tasks', { params: { path: { id: eventId } }, body })).catch(
        (error: unknown) => {
          throw personalError(error)
        },
      ),
    onSuccess: invalidate,
  })
}

export function useUpdateTask(eventId: string) {
  const invalidate = useTaskInvalidate(eventId)
  return useMutation<ParticipantTask, Error, { id: string; body: UpdateTaskRequest }>({
    mutationFn: ({ id, body }) =>
      unwrap(api.PATCH('/me/tasks/{id}', { params: { path: { id } }, body })).catch(
        (error: unknown) => {
          throw personalError(error)
        },
      ),
    onSuccess: invalidate,
  })
}

export function useDeleteTask(eventId: string) {
  const invalidate = useTaskInvalidate(eventId)
  return useMutation<unknown, Error, string>({
    mutationFn: (id) =>
      unwrap(api.DELETE('/me/tasks/{id}', { params: { path: { id } } })).catch((error: unknown) => {
        throw personalError(error)
      }),
    onSuccess: invalidate,
  })
}

export function useApplyTemplate(eventId: string) {
  const invalidate = useTaskInvalidate(eventId)
  return useMutation<BatchResult, Error, string>({
    mutationFn: (templateId) =>
      unwrap(
        api.POST('/me/events/{id}/tasks/apply-template', {
          params: { path: { id: eventId } },
          body: { template_id: templateId },
        }),
      ).catch((error: unknown) => {
        throw personalError(error)
      }),
    onSuccess: invalidate,
  })
}
