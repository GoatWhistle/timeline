import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '@/shared/api/client'
import type { QueryParams } from '@/shared/api/params'
import { personalKeys } from './personal.keys'
import { personalError } from './personal-absence'

export type HistoryParams = QueryParams<'/me/history', 'get'>
export type BookmarksParams = QueryParams<'/me/bookmarks', 'get'>

export function historyQuery(params: HistoryParams) {
  return queryOptions({
    queryKey: personalKeys.history(params),
    queryFn: () => unwrap(api.GET('/me/history', { params: { query: params } })),
  })
}

export function bookmarksQuery(params: BookmarksParams) {
  return queryOptions({
    queryKey: personalKeys.bookmarks(params),
    queryFn: () => unwrap(api.GET('/me/bookmarks', { params: { query: params } })),
  })
}

function useBookmarkInvalidate() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: ['personal-bookmarks'] })
    queryClient.invalidateQueries({ queryKey: ['catalog'] })
  }
}

export function useAddBookmark() {
  const invalidate = useBookmarkInvalidate()
  return useMutation<unknown, Error, string>({
    mutationFn: (eventId) =>
      unwrap(api.PUT('/me/bookmarks/{id}', { params: { path: { id: eventId } } })).catch(
        (error: unknown) => {
          throw personalError(error)
        },
      ),
    onSuccess: invalidate,
  })
}

export function useRemoveBookmark() {
  const invalidate = useBookmarkInvalidate()
  return useMutation<unknown, Error, string>({
    mutationFn: (eventId) =>
      unwrap(api.DELETE('/me/bookmarks/{id}', { params: { path: { id: eventId } } })).catch(
        (error: unknown) => {
          throw personalError(error)
        },
      ),
    onSuccess: invalidate,
  })
}
