import { describe, expect, it } from 'vitest'
import { derivePreviewState, statusCodeOf } from '@/entities/notification-preview'
import { ApiError } from '@/shared/api/errors'
import type { NotificationPreviewResponse } from '@/shared/api/types.gen'

const PREVIEW: NotificationPreviewResponse = {
  subject: 'Timeline: register for the event',
  body: 'The deadline is close.',
  channels: ['EMAIL'],
  channel_ready: true,
  deadline_local: '14.09.2026 18:00',
  deadline_utc: '2026-09-14T15:00:00Z',
  event_title: 'Autumn hackathon',
  language: 'ru',
  registration_url: 'https://example.com/register',
  days_before: 3,
  scheduled_at: '2026-09-13T18:00:00Z',
  timezone_id: 'Europe/Moscow',
  type: 'REMINDER_REGISTRATION_DEADLINE',
}

function base() {
  return { enabled: true, isPending: false, isError: false }
}

describe('statusCodeOf', () => {
  it('reads the status of an API error', () => {
    expect(statusCodeOf(new ApiError(404))).toBe(404)
  })

  it('returns null for anything that is not an API error', () => {
    expect(statusCodeOf(new Error('boom'))).toBeNull()
    expect(statusCodeOf(null)).toBeNull()
    expect(statusCodeOf(undefined)).toBeNull()
  })
})

describe('derivePreviewState', () => {
  it('stays idle while the dialog is closed', () => {
    expect(derivePreviewState({ ...base(), enabled: false }).kind).toBe('idle')
  })

  it('loads while the request is in flight', () => {
    expect(derivePreviewState({ ...base(), isPending: true }).kind).toBe('loading')
  })

  it('reads a 404 as nothing to send rather than a failure', () => {
    const state = derivePreviewState({
      ...base(),
      isError: true,
      error: new ApiError(404),
    })
    expect(state.kind).toBe('nothing-to-send')
  })

  it('reports any other failure as an error', () => {
    const state = derivePreviewState({ ...base(), isError: true, error: new ApiError(500) })
    expect(state.kind).toBe('error')
  })

  it('renders the preview once it arrives', () => {
    const state = derivePreviewState({ ...base(), data: PREVIEW })
    expect(state).toMatchObject({ kind: 'ready', channelReady: true })
  })

  it('keeps an unusable channel as information, not an error', () => {
    const state = derivePreviewState({
      ...base(),
      data: { ...PREVIEW, channel_ready: false },
    })
    expect(state).toMatchObject({ kind: 'ready', channelReady: false })
  })

  it('waits rather than rendering an empty body when data is missing', () => {
    expect(derivePreviewState({ ...base(), data: undefined }).kind).toBe('loading')
  })
})
