import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '@/shared/api/client'
import type { ParticipantRetrospective, SaveRetrospectiveRequest } from '@/shared/api/types.gen'
import { personalKeys } from './personal.keys'
import { asAbsence, personalError } from './personal-absence'
import { textOf } from './personal-fields'

export const RETRO_FIELD_MAX = 20000

export const RETRO_FIELDS = ['went_well', 'went_badly', 'next_time'] as const

export type RetroField = (typeof RETRO_FIELDS)[number]

export type RetroDraft = Record<RetroField, string>

export const EMPTY_RETRO: RetroDraft = { went_well: '', went_badly: '', next_time: '' }

export const RETRO_FIELD_KEY: Record<RetroField, string> = {
  went_well: 'event:personal.retro.wentWell',
  went_badly: 'event:personal.retro.wentBadly',
  next_time: 'event:personal.retro.nextTime',
}

export function isRetroEmpty(draft: RetroDraft): boolean {
  return RETRO_FIELDS.every((field) => draft[field].trim() === '')
}

export function toDraft(item: ParticipantRetrospective | null): RetroDraft {
  if (item === null) return EMPTY_RETRO
  return {
    went_well: textOf(item.went_well),
    went_badly: textOf(item.went_badly),
    next_time: textOf(item.next_time),
  }
}

export function retrospectiveQuery(eventId: string) {
  return queryOptions({
    queryKey: personalKeys.retrospective(eventId),
    queryFn: async (): Promise<ParticipantRetrospective | null> => {
      try {
        return await unwrap(
          api.GET('/me/events/{id}/retrospective', { params: { path: { id: eventId } } }),
        )
      } catch (error) {
        return asAbsence(personalError(error), null)
      }
    },
  })
}

function useRetroInvalidate(eventId: string) {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: personalKeys.retrospective(eventId) })
}

export function useSaveRetrospective(eventId: string) {
  const invalidate = useRetroInvalidate(eventId)
  return useMutation<ParticipantRetrospective, Error, SaveRetrospectiveRequest>({
    mutationFn: (body) =>
      unwrap(
        api.PUT('/me/events/{id}/retrospective', { params: { path: { id: eventId } }, body }),
      ).catch((error: unknown) => {
        throw personalError(error)
      }),
    onSuccess: invalidate,
  })
}

export function useDeleteRetrospective(eventId: string) {
  const invalidate = useRetroInvalidate(eventId)
  return useMutation<unknown, Error, void>({
    mutationFn: () =>
      unwrap(
        api.DELETE('/me/events/{id}/retrospective', { params: { path: { id: eventId } } }),
      ).catch((error: unknown) => {
        throw personalError(error)
      }),
    onSuccess: invalidate,
  })
}
