import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/shared/api/errors'
import type { FieldError } from '@/shared/api/types.gen'
import { applyServerErrors } from '@/shared/forms/server-errors'
import { ensureLocale, i18n } from '@/shared/i18n/config'
import { errorMessage } from '@/shared/i18n/error-message'
import { LOCALES, type Locale } from '@/shared/i18n/locale'

type Form = { name: string; deadline_at: string; root: string }

const KNOWN = ['name', 'deadline_at'] as const

function field(name: string, message: string, code = ''): FieldError {
  return { field: name, code, message }
}

function validation(fields: FieldError[], message = 'invalid request') {
  return new ApiError(400, { code: 'validation_failed', message, fields })
}

describe('applyServerErrors', () => {
  it('routes a server field error onto the matching form field', () => {
    const setError = vi.fn()
    applyServerErrors<Form>(validation([field('name', 'is required')]), setError, KNOWN)
    expect(setError).toHaveBeenCalledTimes(1)
    expect(setError).toHaveBeenCalledWith('name', { message: 'is required' })
  })

  it('routes every recognised field, not only the first', () => {
    const setError = vi.fn()
    applyServerErrors<Form>(
      validation([
        field('name', 'is required'),
        field('deadline_at', 'must be earlier than end_at'),
      ]),
      setError,
      KNOWN,
    )
    expect(setError).toHaveBeenCalledTimes(2)
    expect(setError).toHaveBeenCalledWith('deadline_at', {
      message: 'must be earlier than end_at',
    })
  })

  it('carries the explanation to the root error when the form has no such field', () => {
    const setError = vi.fn()
    applyServerErrors<Form>(
      validation([field('unknown_column', 'the column is required')], 'invalid request'),
      setError,
      KNOWN,
    )
    expect(setError).toHaveBeenCalledTimes(1)
    expect(setError).toHaveBeenCalledWith('root', {
      message: 'the column is required',
    })
  })

  it('falls back to the root error when the server names no field at all', () => {
    const setError = vi.fn()
    applyServerErrors<Form>(
      new ApiError(409, { code: 'already_member', message: 'conflict on the record' }),
      setError,
      KNOWN,
    )
    expect(setError).toHaveBeenCalledWith('root', { message: errorMessage('already_member') })
  })

  it('still reports the recognised field when another field is unknown', () => {
    const setError = vi.fn()
    applyServerErrors<Form>(
      validation([field('unknown_column', 'the column is wrong'), field('name', 'is required')]),
      setError,
      KNOWN,
    )
    expect(setError).toHaveBeenCalledWith('name', { message: 'is required' })
    expect(setError).toHaveBeenCalledWith('root', { message: 'the column is wrong' })
  })

  it('supplies a placeholder when the server sends a field without a message', () => {
    const setError = vi.fn()
    const error = new ApiError(400, {
      code: 'validation_failed',
      message: 'invalid request',
      fields: [{ field: 'name' } as unknown as FieldError],
    })
    applyServerErrors<Form>(error, setError, KNOWN)
    const [field, payload] = setError.mock.calls[0] as [string, { message: string }]
    expect(field).toBe('name')
    expect(payload.message).toBeTruthy()
    expect(payload.message).not.toBe('invalid request')
  })

  it('reports a transport failure on the form instead of throwing past every handler', () => {
    const setError = vi.fn()
    const dropped = new TypeError('Failed to fetch')

    expect(() => applyServerErrors<Form>(dropped, setError, KNOWN)).not.toThrow()

    const [field, payload] = setError.mock.calls[0] as [string, { message: string }]
    expect(field).toBe('root')
    expect(payload.message).not.toContain('Failed to fetch')
    expect(payload.message).toBeTruthy()
  })
})

describe('what the form shows is never the raw English the server sent', () => {
  it.each(LOCALES)('translates the served code onto the root error in %s', async (lc) => {
    await ensureLocale(lc as Locale)
    await i18n.changeLanguage(lc)
    const setError = vi.fn()

    applyServerErrors<Form>(
      new ApiError(409, { code: 'already_member', message: 'RAW ENGLISH FALLBACK' }),
      setError,
      KNOWN,
    )

    const [, payload] = setError.mock.calls[0] as [string, { message: string }]
    expect(payload.message).not.toContain('RAW ENGLISH FALLBACK')
    expect(payload.message).toBe(i18n.getResource(lc, 'errors', 'already_member'))
  })

  it.each(LOCALES)('never shows the browser fetch wording in %s', async (lc) => {
    await ensureLocale(lc as Locale)
    await i18n.changeLanguage(lc)
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
    const setError = vi.fn()

    applyServerErrors<Form>(new TypeError('Failed to fetch'), setError, KNOWN)

    const [, payload] = setError.mock.calls[0] as [string, { message: string }]
    expect(payload.message).not.toContain('fetch')
    expect(payload.message).toBe(i18n.getResource(lc, 'errors', 'transport_network'))
    vi.restoreAllMocks()
  })
})
