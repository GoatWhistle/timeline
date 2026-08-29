import { describe, expect, it } from 'vitest'
import { describeDevice, deviceKind, sortSessions } from '@/entities/session/device-label'
import type { SessionResponse } from '@/shared/api/types.gen'

const CHROME_WINDOWS =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'
const SAFARI_IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
const FIREFOX_LINUX = 'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0'
const EDGE_WINDOWS =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36 Edg/120.0'

describe('deviceKind', () => {
  it('recognises a desktop browser', () => {
    expect(deviceKind(CHROME_WINDOWS)).toBe('desktop')
  })

  it('recognises a phone', () => {
    expect(deviceKind(SAFARI_IPHONE)).toBe('mobile')
  })

  it('recognises a tablet', () => {
    expect(deviceKind('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) Safari/604.1')).toBe('tablet')
  })

  it('treats Android without the mobile token as a tablet', () => {
    expect(deviceKind('Mozilla/5.0 (Linux; Android 14) Chrome/120.0 Safari/537.36')).toBe('tablet')
  })

  it('returns unknown for a missing user agent', () => {
    expect(deviceKind('')).toBe('unknown')
    expect(deviceKind(null)).toBe('unknown')
    expect(deviceKind(undefined)).toBe('unknown')
  })
})

describe('describeDevice', () => {
  it('names the browser and the platform', () => {
    expect(describeDevice(CHROME_WINDOWS)).toEqual({
      kind: 'desktop',
      browser: 'Chrome',
      platform: 'Windows',
    })
  })

  it('prefers Edge over the Chrome token it also carries', () => {
    expect(describeDevice(EDGE_WINDOWS).browser).toBe('Edge')
  })

  it('prefers Chrome over the Safari token it also carries', () => {
    expect(describeDevice(CHROME_WINDOWS).browser).toBe('Chrome')
  })

  it('recognises Safari on iOS', () => {
    expect(describeDevice(SAFARI_IPHONE)).toEqual({
      kind: 'mobile',
      browser: 'Safari',
      platform: 'iOS',
    })
  })

  it('recognises Firefox on Linux', () => {
    expect(describeDevice(FIREFOX_LINUX)).toEqual({
      kind: 'desktop',
      browser: 'Firefox',
      platform: 'Linux',
    })
  })

  it('returns nulls rather than guessing when the agent is empty', () => {
    expect(describeDevice(null)).toEqual({ kind: 'unknown', browser: null, platform: null })
  })
})

describe('sortSessions', () => {
  function session(patch: Partial<SessionResponse>): SessionResponse {
    return {
      id: 'a',
      created_at: '2026-08-01T00:00:00Z',
      current: false,
      expires_at: '2026-09-01T00:00:00Z',
      ip: '203.0.113.7',
      last_used_at: '2026-08-01T00:00:00Z',
      user_agent: CHROME_WINDOWS,
      ...patch,
    }
  }

  it('puts the current session first', () => {
    const list = [
      session({ id: 'other', last_used_at: '2026-08-28T10:00:00Z' }),
      session({ id: 'mine', current: true, last_used_at: '2026-01-01T10:00:00Z' }),
    ]
    expect(sortSessions(list).map((item) => item.id)).toEqual(['mine', 'other'])
  })

  it('orders the rest by last use, most recent first', () => {
    const list = [
      session({ id: 'old', last_used_at: '2026-01-01T00:00:00Z' }),
      session({ id: 'new', last_used_at: '2026-08-01T00:00:00Z' }),
    ]
    expect(sortSessions(list).map((item) => item.id)).toEqual(['new', 'old'])
  })

  it('does not mutate the input', () => {
    const list = [session({ id: 'a' }), session({ id: 'b', current: true })]
    sortSessions(list)
    expect(list.map((item) => item.id)).toEqual(['a', 'b'])
  })
})
