import { useQueryClient } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useSession } from '@/shared/api/session'
import { createEditingGuard, EditingGuardContext } from './editing-guard'
import { backoffDelay, type ConnectionState, parseEnvelope, realtimeUrl } from './envelope'
import { useEditingFocus } from './use-editing-focus'

interface RealtimeValue {
  state: ConnectionState
  degraded: boolean
}

const RealtimeContext = createContext<RealtimeValue>({ state: 'connecting', degraded: false })

export function useRealtime(): RealtimeValue {
  return useContext(RealtimeContext)
}

const DEGRADED_AFTER_MS = 5_000

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const { isAuthenticated: enabled } = useSession()
  const [state, setState] = useState<ConnectionState>('connecting')
  const [degraded, setDegraded] = useState(false)
  const guard = useMemo(createEditingGuard, [])
  const pending = useRef<string[][]>([])

  useEditingFocus(guard)

  useEffect(() => {
    if (!enabled) {
      setState('offline')
      return
    }

    setState('connecting')

    let socket: WebSocket | null = null
    let attempt = 0
    let retryTimer: number | undefined
    let flushTimer: number | undefined
    let closed = false

    const applyKeys = (keys: string[]) => {
      void queryClient.invalidateQueries({ queryKey: keys })
    }

    const flush = () => {
      if (guard.isHeld()) return
      const queued = pending.current
      pending.current = []
      for (const keys of queued) applyKeys(keys)
    }

    flushTimer = window.setInterval(flush, 1_000)

    const connect = () => {
      if (closed) return
      setState((current) => (current === 'open' ? 'connecting' : current))
      socket = new WebSocket(realtimeUrl())

      socket.onopen = () => {
        attempt = 0
        setState('open')
      }

      socket.onmessage = (message: MessageEvent<string>) => {
        const envelope = parseEnvelope(message.data)
        if (!envelope) return
        if (envelope.type === 'invalidate') {
          if (guard.isHeld()) {
            pending.current.push(envelope.keys)
            return
          }
          applyKeys(envelope.keys)
          return
        }
        if (envelope.type === 'event') {
          void queryClient.invalidateQueries({ queryKey: ['events-feed'] })
        }
      }

      socket.onclose = () => {
        if (closed) return
        setState('offline')
        attempt += 1
        retryTimer = window.setTimeout(connect, backoffDelay(attempt))
      }

      socket.onerror = () => {
        socket?.close()
      }
    }

    connect()

    return () => {
      closed = true
      if (retryTimer) window.clearTimeout(retryTimer)
      if (flushTimer) window.clearInterval(flushTimer)
      socket?.close()
    }
  }, [enabled, guard, queryClient])

  useEffect(() => {
    if (state === 'open') {
      setDegraded(false)
      return
    }
    const timer = window.setTimeout(() => setDegraded(true), DEGRADED_AFTER_MS)
    return () => window.clearTimeout(timer)
  }, [state])

  const value = useMemo(() => ({ state, degraded }), [state, degraded])

  return (
    <EditingGuardContext.Provider value={guard}>
      <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>
    </EditingGuardContext.Provider>
  )
}
