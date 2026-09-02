import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '@/shared/api/client'
import type { Outcome, ParticipantOutcome, SaveOutcomeRequest } from '@/shared/api/types.gen'
import { personalKeys } from './personal.keys'
import { asAbsence, personalError } from './personal-absence'

export const OUTCOMES: Outcome[] = ['PARTICIPATED', 'SHORTLISTED', 'WINNER', 'PRIZE']

export const PLACING_OUTCOMES: Outcome[] = ['SHORTLISTED', 'WINNER', 'PRIZE']

export function allowsPlace(outcome: Outcome): boolean {
  return PLACING_OUTCOMES.includes(outcome)
}

export const OUTCOME_KEY: Record<Outcome, string> = {
  PARTICIPATED: 'event:personal.outcome.value.PARTICIPATED',
  SHORTLISTED: 'event:personal.outcome.value.SHORTLISTED',
  WINNER: 'event:personal.outcome.value.WINNER',
  PRIZE: 'event:personal.outcome.value.PRIZE',
}

export function outcomeQuery(eventId: string) {
  return queryOptions({
    queryKey: personalKeys.outcome(eventId),
    queryFn: async (): Promise<ParticipantOutcome | null> => {
      try {
        return await unwrap(
          api.GET('/me/events/{id}/outcome', { params: { path: { id: eventId } } }),
        )
      } catch (error) {
        return asAbsence(personalError(error), null)
      }
    },
  })
}

function useOutcomeInvalidate(eventId: string) {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: personalKeys.outcome(eventId) })
    queryClient.invalidateQueries({ queryKey: ['personal-history'] })
  }
}

export function useSaveOutcome(eventId: string) {
  const invalidate = useOutcomeInvalidate(eventId)
  return useMutation<ParticipantOutcome, Error, SaveOutcomeRequest>({
    mutationFn: (body) =>
      unwrap(api.PUT('/me/events/{id}/outcome', { params: { path: { id: eventId } }, body })).catch(
        (error: unknown) => {
          throw personalError(error)
        },
      ),
    onSuccess: invalidate,
  })
}

export function useDeleteOutcome(eventId: string) {
  const invalidate = useOutcomeInvalidate(eventId)
  return useMutation<unknown, Error, void>({
    mutationFn: () =>
      unwrap(api.DELETE('/me/events/{id}/outcome', { params: { path: { id: eventId } } })).catch(
        (error: unknown) => {
          throw personalError(error)
        },
      ),
    onSuccess: invalidate,
  })
}
