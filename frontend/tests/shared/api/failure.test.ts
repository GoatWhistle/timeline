import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/shared/api/errors'
import { failureCode, failureKind, failureMessage, isRetryable } from '@/shared/api/failure'
import { ensureLocale, i18n } from '@/shared/i18n/config'
import { LOCALES, type Locale } from '@/shared/i18n/locale'

function offline(value: boolean) {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(value)
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('a transport failure is given a stable code of its own', () => {
  it('names the browser fetch rejection a network failure, not an unknown one', () => {
    offline(true)
    expect(failureCode(new TypeError('Failed to fetch'))).toBe('transport_network')
    expect(failureKind(new TypeError('Failed to fetch'))).toBe('network')
  })

  it('separates a dropped connection from a served error', () => {
    offline(false)
    expect(failureCode(new TypeError('Failed to fetch'))).toBe('transport_offline')
    expect(failureKind(new TypeError('Failed to fetch'))).toBe('offline')
  })

  it('names an aborted request a timeout rather than a network fault', () => {
    const abort = new DOMException('The operation was aborted.', 'AbortError')
    expect(failureCode(abort)).toBe('transport_timeout')
    expect(failureKind(abort)).toBe('timeout')
  })

  it('keeps the server code when the server did answer', () => {
    const error = new ApiError(409, { code: 'already_member', message: 'raw english' })
    expect(failureCode(error)).toBe('already_member')
    expect(failureKind(error)).toBe('api')
  })

  it('separates a 5xx from a 4xx, because only one is the server falling over', () => {
    expect(failureKind(new ApiError(500, { code: 'internal_error' }))).toBe('server')
    expect(failureKind(new ApiError(404, { code: 'not_found' }))).toBe('api')
  })
})

describe('what reaches the screen is never the raw English the server sent', () => {
  it.each(LOCALES)('translates a served code in %s and drops the English fallback', async (lc) => {
    await ensureLocale(lc as Locale)
    await i18n.changeLanguage(lc)

    const message = failureMessage(new ApiError(404, { code: 'not_found', message: 'raw english' }))

    expect(message).not.toContain('raw english')
    expect(message).toBe(i18n.getResource(lc, 'errors', 'not_found'))
  })

  it.each(LOCALES)('never surfaces the browser fetch wording in %s', async (lc) => {
    await ensureLocale(lc as Locale)
    await i18n.changeLanguage(lc)
    offline(true)

    const message = failureMessage(new TypeError('Failed to fetch'))

    expect(message).not.toContain('Failed to fetch')
    expect(message).not.toContain('fetch')
    expect(message).toBe(i18n.getResource(lc, 'errors', 'transport_network'))
    expect(message.length).toBeGreaterThan(0)
  })

  it.each(LOCALES)('has a real sentence for every transport code in %s', async (lc) => {
    await ensureLocale(lc as Locale)

    for (const code of ['transport_network', 'transport_offline', 'transport_timeout']) {
      const text = i18n.getResource(lc, 'errors', code)
      expect(typeof text, `${code} in ${lc}`).toBe('string')
      expect(String(text).length, `${code} in ${lc}`).toBeGreaterThan(10)
    }
  })

  it('falls back to a translated internal error rather than echoing an unknown code', async () => {
    await ensureLocale('ru')
    await i18n.changeLanguage('ru')

    const message = failureMessage(new ApiError(418, { code: 'teapot', message: 'I am a teapot' }))

    expect(message).not.toContain('teapot')
    expect(message).not.toContain('I am a')
    expect(message).toBe(i18n.getResource('ru', 'errors', 'internal_error'))
  })
})

describe('retry is offered only where retrying could help', () => {
  it('offers it for every transport failure, which is what a retry is for', () => {
    offline(true)
    expect(isRetryable(new TypeError('Failed to fetch'))).toBe(true)
    expect(isRetryable(new DOMException('x', 'AbortError'))).toBe(true)
  })

  it('offers it when the server itself fell over', () => {
    expect(isRetryable(new ApiError(500, { code: 'internal_error' }))).toBe(true)
  })

  it('withholds it where the same request would fail the same way', () => {
    expect(isRetryable(new ApiError(403, { code: 'forbidden' }))).toBe(false)
    expect(isRetryable(new ApiError(404, { code: 'not_found' }))).toBe(false)
    expect(isRetryable(new ApiError(400, { code: 'validation_failed' }))).toBe(false)
  })

  it('offers it after a rate limit, because waiting is exactly the remedy', () => {
    expect(isRetryable(new ApiError(429, { code: 'rate_limited' }))).toBe(true)
  })
})
