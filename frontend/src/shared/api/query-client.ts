import { QueryClient } from '@tanstack/react-query'
import { isApiError } from './errors'

/**
 * Общая политика кэша. Повторы отключены для ошибок клиента: 401 обрабатывает
 * middleware, а 403/404/409 повторять бессмысленно.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          if (isApiError(error) && error.status < 500) return false
          return failureCount < 2
        },
      },
      mutations: { retry: false },
    },
  })
}
