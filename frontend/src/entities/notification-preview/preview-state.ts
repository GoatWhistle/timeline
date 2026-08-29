import { isApiError } from '@/shared/api/errors'
import type { NotificationPreviewResponse } from '@/shared/api/types.gen'

export type PreviewState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'nothing-to-send' }
  | { kind: 'error'; error: unknown }
  | { kind: 'ready'; preview: NotificationPreviewResponse; channelReady: boolean }

export function statusCodeOf(error: unknown): number | null {
  return isApiError(error) ? error.status : null
}

export function derivePreviewState({
  enabled,
  isPending,
  isError,
  error,
  data,
}: {
  enabled: boolean
  isPending: boolean
  isError: boolean
  error?: unknown
  data?: NotificationPreviewResponse
}): PreviewState {
  if (!enabled) return { kind: 'idle' }
  if (isError) {
    return statusCodeOf(error) === 404 ? { kind: 'nothing-to-send' } : { kind: 'error', error }
  }
  if (isPending || !data) return { kind: 'loading' }
  return { kind: 'ready', preview: data, channelReady: data.channel_ready === true }
}
