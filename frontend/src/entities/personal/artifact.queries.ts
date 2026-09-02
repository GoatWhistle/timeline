import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '@/shared/api/client'
import type {
  CreateArtifactRequest,
  ParticipantArtifact,
  UpdateArtifactRequest,
} from '@/shared/api/types.gen'
import { personalKeys } from './personal.keys'
import { asAbsence, personalError } from './personal-absence'

const NO_ARTIFACTS: ParticipantArtifact[] = []

export function artifactsQuery(eventId: string) {
  return queryOptions({
    queryKey: personalKeys.artifacts(eventId),
    queryFn: async () => {
      try {
        const data = await unwrap(
          api.GET('/me/events/{id}/artifacts', { params: { path: { id: eventId } } }),
        )
        return data.items
      } catch (error) {
        return asAbsence(personalError(error), NO_ARTIFACTS)
      }
    },
  })
}

function useArtifactInvalidate(eventId: string) {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: personalKeys.artifacts(eventId) })
    queryClient.invalidateQueries({ queryKey: ['personal-history'] })
  }
}

export function useCreateArtifact(eventId: string) {
  const invalidate = useArtifactInvalidate(eventId)
  return useMutation<ParticipantArtifact, Error, CreateArtifactRequest>({
    mutationFn: (body) =>
      unwrap(
        api.POST('/me/events/{id}/artifacts', { params: { path: { id: eventId } }, body }),
      ).catch((error: unknown) => {
        throw personalError(error)
      }),
    onSuccess: invalidate,
  })
}

export function useUpdateArtifact(eventId: string) {
  const invalidate = useArtifactInvalidate(eventId)
  return useMutation<ParticipantArtifact, Error, { id: string; body: UpdateArtifactRequest }>({
    mutationFn: ({ id, body }) =>
      unwrap(api.PATCH('/me/artifacts/{id}', { params: { path: { id } }, body })).catch(
        (error: unknown) => {
          throw personalError(error)
        },
      ),
    onSuccess: invalidate,
  })
}

export function useDeleteArtifact(eventId: string) {
  const invalidate = useArtifactInvalidate(eventId)
  return useMutation<unknown, Error, string>({
    mutationFn: (id) =>
      unwrap(api.DELETE('/me/artifacts/{id}', { params: { path: { id } } })).catch(
        (error: unknown) => {
          throw personalError(error)
        },
      ),
    onSuccess: invalidate,
  })
}
