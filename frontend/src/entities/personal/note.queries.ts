import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '@/shared/api/client'
import type { ParticipantNote } from '@/shared/api/types.gen'
import { personalKeys } from './personal.keys'
import { asAbsence, personalError } from './personal-absence'
import { textOf } from './personal-fields'

export const NOTE_MAX = 20000

const EMPTY_BODY = ''

export function noteQuery(eventId: string) {
  return queryOptions({
    queryKey: personalKeys.note(eventId),
    queryFn: async () => {
      try {
        const note = await unwrap(
          api.GET('/me/events/{id}/note', { params: { path: { id: eventId } } }),
        )
        return textOf(note.body)
      } catch (error) {
        return asAbsence(personalError(error), EMPTY_BODY)
      }
    },
  })
}

export function useSaveNote(eventId: string) {
  const queryClient = useQueryClient()
  return useMutation<ParticipantNote | null, Error, string>({
    mutationFn: (body) =>
      unwrap(
        api.PUT('/me/events/{id}/note', { params: { path: { id: eventId } }, body: { body } }),
      ).catch((error: unknown) => {
        throw personalError(error)
      }),
    onSuccess: (_data, body) => {
      queryClient.setQueryData(personalKeys.note(eventId), body.trim() === '' ? EMPTY_BODY : body)
    },
  })
}
