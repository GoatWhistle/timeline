import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/shared/api/errors'
import type { FieldError } from '@/shared/api/types.gen'
import { applyServerErrors } from '@/shared/forms/server-errors'

type Form = { name: string; deadline_at: string; root: string }

const KNOWN = ['name', 'deadline_at'] as const

function validation(fields: FieldError[], message = 'invalid request') {
  return new ApiError(400, { code: 'validation_failed', message, fields })
}

describe('applyServerErrors', () => {
  it('routes a server field error onto the matching form field', () => {
    const setError = vi.fn()
    applyServerErrors<Form>(
      validation([{ field: 'name', message: 'is required' }]),
      setError,
      KNOWN,
    )
    expect(setError).toHaveBeenCalledTimes(1)
    expect(setError).toHaveBeenCalledWith('name', { message: 'is required' })
  })

  it('routes every recognised field, not only the first', () => {
    const setError = vi.fn()
    applyServerErrors<Form>(
      validation([
        { field: 'name', message: 'is required' },
        { field: 'deadline_at', message: 'must be earlier than end_at' },
      ]),
      setError,
      KNOWN,
    )
    expect(setError).toHaveBeenCalledTimes(2)
    expect(setError).toHaveBeenCalledWith('deadline_at', {
      message: 'must be earlier than end_at',
    })
  })

  it('falls back to the root error when the server names a field the form does not have', () => {
    const setError = vi.fn()
    applyServerErrors<Form>(
      validation([{ field: 'unknown_column', message: 'is required' }], 'invalid request'),
      setError,
      KNOWN,
    )
    expect(setError).toHaveBeenCalledTimes(1)
    expect(setError).toHaveBeenCalledWith('root', { message: 'invalid request' })
  })

  it('falls back to the root error when the server names no field at all', () => {
    const setError = vi.fn()
    applyServerErrors<Form>(validation([], 'conflict on the record'), setError, KNOWN)
    expect(setError).toHaveBeenCalledWith('root', { message: 'conflict on the record' })
  })

  it('still reports the recognised field when another field is unknown', () => {
    const setError = vi.fn()
    applyServerErrors<Form>(
      validation([
        { field: 'unknown_column', message: 'ignored' },
        { field: 'name', message: 'is required' },
      ]),
      setError,
      KNOWN,
    )
    expect(setError).toHaveBeenCalledTimes(1)
    expect(setError).toHaveBeenCalledWith('name', { message: 'is required' })
  })

  it('supplies a placeholder when the server sends a field without a message', () => {
    const setError = vi.fn()
    const error = new ApiError(400, {
      code: 'validation_failed',
      message: 'invalid request',
      fields: [{ field: 'name' } as FieldError],
    })
    applyServerErrors<Form>(error, setError, KNOWN)
    const [field, payload] = setError.mock.calls[0] as [string, { message: string }]
    expect(field).toBe('name')
    expect(payload.message).toBeTruthy()
    expect(payload.message).not.toBe('invalid request')
  })

  it('rethrows anything that is not an API error, so a bug is not swallowed as a field error', () => {
    const setError = vi.fn()
    const boom = new TypeError('reading of undefined')
    expect(() => applyServerErrors<Form>(boom, setError, KNOWN)).toThrow(boom)
    expect(setError).not.toHaveBeenCalled()
  })
})
