import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'

export function useUrlFilters<T extends Record<string, string | undefined>>(defaults: T) {
  const [searchParams, setSearchParams] = useSearchParams()

  const filters = useMemo(() => {
    const result = { ...defaults }
    for (const key of Object.keys(defaults) as (keyof T)[]) {
      const value = searchParams.get(String(key))
      if (value !== null) result[key] = value as T[keyof T]
    }
    return result
  }, [searchParams, defaults])

  const setFilters = useCallback(
    (patch: Partial<Record<keyof T, string | undefined>>, options?: { resetPage?: boolean }) => {
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous)
          for (const [key, value] of Object.entries(patch)) {
            if (value === undefined || value === '') next.delete(key)
            else next.set(key, value)
          }
          if (options?.resetPage !== false && !('page' in patch)) next.delete('page')
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  return [filters, setFilters] as const
}

export function usePageParam(): [number, (page: number) => void] {
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Number.parseInt(searchParams.get('page') ?? '1', 10)

  const setPage = useCallback(
    (next: number) => {
      setSearchParams(
        (previous) => {
          const params = new URLSearchParams(previous)
          if (next <= 1) params.delete('page')
          else params.set('page', String(next))
          return params
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  return [Number.isNaN(page) || page < 1 ? 1 : page, setPage]
}
