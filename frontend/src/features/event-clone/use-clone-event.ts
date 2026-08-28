import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '@/shared/api/client'
import type { EventResponse, StageResponse } from '@/shared/api/types.gen'
import { cloneEventPayload, cloneStagePayload } from './shift-dates'

export type CloneOutcome = {
  event: EventResponse
  stagesRequested: number
  stagesCreated: number
}

export function useCloneEvent() {
  const queryClient = useQueryClient()

  return useMutation<
    CloneOutcome,
    Error,
    { source: EventResponse; title: string; days: number; withStages: boolean }
  >({
    mutationFn: async ({ source, title, days, withStages }) => {
      const created = await unwrap(
        api.POST('/admin/events', { body: cloneEventPayload(source, title, days) }),
      )

      let stages: StageResponse[] = []
      if (withStages) {
        stages = await unwrap(
          api.GET('/events/{id}/stages', { params: { path: { id: source.id } } }),
        )
      }

      let stagesCreated = 0
      for (const stage of stages) {
        await unwrap(
          api.POST('/admin/events/{id}/stages', {
            params: { path: { id: created.id } },
            body: cloneStagePayload(stage, days),
          }),
        )
        stagesCreated += 1
      }

      return { event: created, stagesRequested: stages.length, stagesCreated }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-events'] }),
  })
}
