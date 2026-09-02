import { QueryClientProvider } from '@tanstack/react-query'
import { render, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createQueryClient } from '@/shared/api/query-client'
import { sessionQueryKey } from '@/shared/api/session'
import { RealtimeProvider, useRealtime } from '@/shared/realtime/realtime-context'

class FakeSocket {
  static opened: FakeSocket[] = []
  onopen: (() => void) | null = null
  onclose: (() => void) | null = null
  onerror: (() => void) | null = null
  onmessage: ((event: MessageEvent<string>) => void) | null = null

  constructor(readonly url: string) {
    FakeSocket.opened.push(this)
  }

  close() {
    this.onclose?.()
  }

  reject() {
    this.onerror?.()
  }
}

function Probe() {
  const { state } = useRealtime()
  return <span data-testid="state">{state}</span>
}

function renderProvider(authenticated: boolean) {
  const queryClient = createQueryClient()
  if (authenticated) {
    queryClient.setQueryData(sessionQueryKey, { is_admin: false })
  }

  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }

  const view = render(
    <RealtimeProvider>
      <Probe />
    </RealtimeProvider>,
    { wrapper: Wrapper },
  )
  return { ...view, queryClient }
}

describe('realtime connection', () => {
  beforeEach(() => {
    FakeSocket.opened = []
    vi.stubGlobal('WebSocket', FakeSocket)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('opens no socket while nobody is signed in', () => {
    renderProvider(false)
    expect(FakeSocket.opened).toHaveLength(0)
  })

  it('opens the socket as soon as a session appears', async () => {
    const { queryClient } = renderProvider(false)
    expect(FakeSocket.opened).toHaveLength(0)

    queryClient.setQueryData(sessionQueryKey, { is_admin: false })

    await waitFor(() => expect(FakeSocket.opened).toHaveLength(1))
  })
})
