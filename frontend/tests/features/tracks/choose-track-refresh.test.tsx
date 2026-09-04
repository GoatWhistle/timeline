import { QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { useChooseTrack } from '@/features/tracks/track.queries'
import { createQueryClient } from '@/shared/api/query-client'

vi.mock('@/shared/api/client', () => ({
  api: { PUT: vi.fn(async () => ({ data: { id: 'te_1' } })) },
  unwrap: vi.fn(async (promise: Promise<{ data: unknown }>) => (await promise).data),
}))

const TEAM = 'tm_42ej2s5gh7e8'
const EVENT = 'ev_gma9hq8a96q5'

function harness() {
  const queryClient = createQueryClient()
  const invalidated: unknown[][] = []
  const original = queryClient.invalidateQueries.bind(queryClient)
  queryClient.invalidateQueries = ((filters: { queryKey?: unknown[] }) => {
    if (filters?.queryKey) invalidated.push(filters.queryKey)
    return original(filters)
  }) as typeof queryClient.invalidateQueries

  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }

  return { queryClient, invalidated, Wrapper }
}

describe('choosing a track refreshes the screen that shows the choice', () => {
  it('invalidates the entry the team event detail screen reads, not only the list', async () => {
    const { invalidated, Wrapper } = harness()
    const { result } = renderHook(() => useChooseTrack(TEAM, EVENT), { wrapper: Wrapper })

    await result.current.mutateAsync({ track_id: 'tr_two' })

    await waitFor(() => {
      expect(invalidated.some((key) => key[0] === 'team-event' && key[1] === TEAM)).toBe(true)
    })
  })

  it('still invalidates the list of entries the team hackathons tab reads', async () => {
    const { invalidated, Wrapper } = harness()
    const { result } = renderHook(() => useChooseTrack(TEAM, EVENT), { wrapper: Wrapper })

    await result.current.mutateAsync({ track_id: 'tr_two' })

    await waitFor(() => {
      expect(invalidated.some((key) => key[0] === 'team-events' && key[1] === TEAM)).toBe(true)
    })
  })
})
