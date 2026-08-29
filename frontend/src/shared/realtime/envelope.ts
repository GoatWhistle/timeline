export type RealtimeEnvelope =
  | { type: 'hello'; server_time?: string }
  | { type: 'invalidate'; keys: string[] }
  | { type: 'event'; event: RealtimeEvent }

export interface RealtimeEvent {
  id: string
  type: string
  severity: 'INFO' | 'WARNING' | 'CRITICAL'
  subject_type?: string
  payload: Record<string, unknown>
  read: boolean
  created_at: string
}

export type ConnectionState = 'connecting' | 'open' | 'offline'

export function parseEnvelope(raw: string): RealtimeEnvelope | null {
  try {
    const parsed = JSON.parse(raw) as RealtimeEnvelope
    if (parsed && typeof parsed.type === 'string') return parsed
    return null
  } catch {
    return null
  }
}

export function realtimeUrl(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}/api/v1/realtime`
}

const BACKOFF_STEPS = [1_000, 2_000, 5_000, 10_000, 30_000]

export function backoffDelay(attempt: number): number {
  const index = Math.min(Math.max(attempt - 1, 0), BACKOFF_STEPS.length - 1)
  return BACKOFF_STEPS[index] ?? 30_000
}
