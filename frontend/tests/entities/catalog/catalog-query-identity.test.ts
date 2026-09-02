import { hashKey, QueryClient } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import { type CatalogParams, catalogQuery } from '@/entities/catalog/catalog.queries'

function params(): CatalogParams {
  return {
    origin: 'RU',
    kind: 'HACKATHON',
    format: 'ONLINE',
    state: 'UPCOMING',
    sort: 'start_at',
    order: 'asc',
  }
}

describe('catalog query identity across renders', () => {
  it('hashes a freshly built parameter object to the same key', () => {
    expect(hashKey(catalogQuery(params()).queryKey)).toBe(hashKey(catalogQuery(params()).queryKey))
  })

  it('does not refetch when a render rebuilds an equal parameter object', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Number.POSITIVE_INFINITY } },
    })
    const queryFn = vi.fn().mockResolvedValue({ items: [], meta: { total: 0 } })

    for (let render = 0; render < 5; render++) {
      await client.fetchQuery({ ...catalogQuery(params()), queryFn })
    }

    expect(queryFn).toHaveBeenCalledTimes(1)
    client.clear()
  })

  it('does refetch when a filter actually changes', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Number.POSITIVE_INFINITY } },
    })
    const queryFn = vi.fn().mockResolvedValue({ items: [], meta: { total: 0 } })

    await client.fetchQuery({ ...catalogQuery(params()), queryFn })
    await client.fetchQuery({
      ...catalogQuery({ ...params(), origin: 'WORLD' }),
      queryFn,
    })

    expect(queryFn).toHaveBeenCalledTimes(2)
    client.clear()
  })
})
