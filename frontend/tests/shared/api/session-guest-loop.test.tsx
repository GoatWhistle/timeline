import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createQueryClient } from '@/shared/api/query-client'
import { useSession } from '@/shared/api/session'

const BASE_URL = 'http://localhost/api/v1'

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function SessionProbe() {
  const { isLoading, isAuthenticated } = useSession()
  if (isLoading) return <div data-testid="loading" />
  return <div data-testid="settled">{isAuthenticated ? 'authenticated' : 'guest'}</div>
}

describe('a guest reading a public page never drives /me into a refetch storm', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  function requestUrl(input: RequestInfo | URL): string {
    if (typeof input === 'string') return input
    if (input instanceof Request) return input.url
    return input.toString()
  }

  beforeEach(() => {
    fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = requestUrl(input)
      if (url.startsWith(`${BASE_URL}/me`)) {
        return jsonResponse(401, { error: { code: 'unauthorized' } })
      }
      if (url.startsWith(`${BASE_URL}/auth/refresh`)) {
        return jsonResponse(401, { error: { code: 'unauthorized' } })
      }
      if (url.startsWith(`${BASE_URL}/auth/csrf`)) {
        return jsonResponse(200, { csrf_token: 'test-token', header_name: 'X-CSRF-Token' })
      }
      throw new Error(`unexpected fetch: ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function callsTo(path: string): number {
    return fetchMock.mock.calls.filter(([input]) =>
      requestUrl(input).startsWith(`${BASE_URL}${path}`),
    ).length
  }

  it('settles to the guest state after exactly one failed refresh attempt', async () => {
    const queryClient = createQueryClient()
    render(
      <QueryClientProvider client={queryClient}>
        <SessionProbe />
      </QueryClientProvider>,
    )

    await waitFor(() => expect(screen.getByTestId('settled')).toHaveTextContent('guest'))
    await waitFor(() => expect(callsTo('/auth/refresh')).toBe(1))

    expect(callsTo('/me')).toBe(1)
    expect(callsTo('/auth/refresh')).toBe(1)
  })

  it('does not refetch when a second consumer mounts on the same already-failed session', async () => {
    const queryClient = createQueryClient()
    const first = render(
      <QueryClientProvider client={queryClient}>
        <SessionProbe />
      </QueryClientProvider>,
    )

    await waitFor(() => expect(screen.getByTestId('settled')).toHaveTextContent('guest'))
    const meCallsAfterFirstMount = callsTo('/me')
    expect(meCallsAfterFirstMount).toBe(1)

    first.unmount()

    render(
      <QueryClientProvider client={queryClient}>
        <SessionProbe />
      </QueryClientProvider>,
    )

    await waitFor(() => expect(screen.getByTestId('settled')).toHaveTextContent('guest'))

    expect(callsTo('/me')).toBe(meCallsAfterFirstMount)
    expect(callsTo('/auth/refresh')).toBe(meCallsAfterFirstMount)
  })
})
