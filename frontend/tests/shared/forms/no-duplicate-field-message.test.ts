import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/shared/api/errors'
import { applyServerErrors } from '@/shared/forms/server-errors'

function conflict(field: string, code: string): ApiError {
  return new ApiError(409, {
    code: 'deadline_after_end',
    message: 'the registration deadline must not be later than the event end',
    fields: [{ field, code, message: 'must not be later than the event end' }],
  })
}

describe('a field shown by its own control is not repeated at the foot of the form', () => {
  it('says nothing at the form level when the blamed field renders its own message', () => {
    const setError = vi.fn()

    applyServerErrors(conflict('deadline_at', 'out_of_range'), setError, ['url'], ['deadline_at'])

    expect(setError).not.toHaveBeenCalled()
  })

  it('still places a field the form itself owns', () => {
    const setError = vi.fn()

    applyServerErrors(conflict('url', 'invalid_format'), setError, ['url'], ['deadline_at'])

    expect(setError).toHaveBeenCalledTimes(1)
    expect(setError.mock.calls[0]?.[0]).toBe('url')
  })

  it('still falls back to the form level for a field nobody renders', () => {
    const setError = vi.fn()

    applyServerErrors(conflict('mystery', 'out_of_range'), setError, ['url'], ['deadline_at'])

    expect(setError).toHaveBeenCalledTimes(1)
    expect(setError.mock.calls[0]?.[0]).toBe('root')
  })

  it('keeps the moment fields of a period out of the form-level summary', () => {
    const setError = vi.fn()
    const error = new ApiError(400, {
      code: 'validation_failed',
      message: 'the stage needs an end',
      fields: [
        { field: 'end_at', code: 'end_before_start', message: 'must be later than start_at' },
      ],
    })

    applyServerErrors(error, setError, ['name'], ['start_at', 'end_at'])

    expect(setError).not.toHaveBeenCalled()
  })
})
