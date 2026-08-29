import { describe, expect, it } from 'vitest'
import { ApiError, isApiError, toApiError } from '@/shared/api/errors'

describe('ApiError', () => {
  it('keeps the server code and message when the body carries them', () => {
    const error = new ApiError(409, {
      code: 'invalid_state_transition',
      message: 'the transition is not allowed',
      request_id: 'req-42',
    })
    expect(error.status).toBe(409)
    expect(error.code).toBe('invalid_state_transition')
    expect(error.message).toBe('the transition is not allowed')
    expect(error.requestId).toBe('req-42')
  })

  it('derives a stable code per status when the body omits one', () => {
    expect(new ApiError(400).code).toBe('validation_failed')
    expect(new ApiError(401).code).toBe('unauthorized')
    expect(new ApiError(403).code).toBe('forbidden')
    expect(new ApiError(404).code).toBe('not_found')
    expect(new ApiError(409).code).toBe('conflict')
    expect(new ApiError(429).code).toBe('rate_limited')
    expect(new ApiError(503).code).toBe('internal_error')
  })

  it('falls back to internal_error for a status with no mapping', () => {
    expect(new ApiError(418).code).toBe('internal_error')
    expect(new ApiError(500).code).toBe('internal_error')
  })

  it('reports a validation error only when 400 arrives with field errors', () => {
    const withFields = new ApiError(400, {
      code: 'validation_failed',
      fields: [{ field: 'name', message: 'is required' }],
    })
    expect(withFields.isValidation).toBe(true)
    expect(new ApiError(400).isValidation).toBe(false)
    expect(
      new ApiError(409, { fields: [{ field: 'name', message: 'is required' }] }).isValidation,
    ).toBe(false)
  })

  it('exposes an empty field list when the body carries none', () => {
    expect(new ApiError(500).fields).toEqual([])
    expect(new ApiError(500).requestId).toBeUndefined()
  })

  it('prefers the dictionary text over the server fallback message', () => {
    const error = new ApiError(403, { code: 'forbidden', message: 'raw server text' })
    expect(error.message).toBe('raw server text')
    expect(error.localizedMessage).not.toBe('')
    expect(typeof error.localizedMessage).toBe('string')
  })

  it('falls back to the server message when the code is absent from the dictionary', () => {
    const error = new ApiError(400, { code: 'code_that_is_in_no_dictionary', message: 'fallback' })
    expect(error.localizedMessage).toBe('fallback')
  })

  it('is an Error and is recognised by the guard', () => {
    const error = new ApiError(404)
    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe('ApiError')
    expect(isApiError(error)).toBe(true)
  })
})

describe('isApiError', () => {
  it('rejects anything that is not an ApiError', () => {
    expect(isApiError(new Error('plain'))).toBe(false)
    expect(isApiError({ status: 404, code: 'not_found' })).toBe(false)
    expect(isApiError(null)).toBe(false)
    expect(isApiError(undefined)).toBe(false)
    expect(isApiError('not_found')).toBe(false)
  })
})

describe('toApiError', () => {
  it('unwraps the error envelope the server sends', () => {
    const error = toApiError(409, {
      error: { code: 'registration_exists', message: 'already there', request_id: 'req-7' },
    })
    expect(error.code).toBe('registration_exists')
    expect(error.message).toBe('already there')
    expect(error.requestId).toBe('req-7')
  })

  it('carries the field errors through the envelope', () => {
    const error = toApiError(400, {
      error: {
        code: 'validation_failed',
        message: 'invalid',
        fields: [{ field: 'deadline_at', message: 'must be earlier than end_at' }],
      },
    })
    expect(error.isValidation).toBe(true)
    expect(error.fields).toHaveLength(1)
    expect(error.fields[0]?.field).toBe('deadline_at')
  })

  it('falls back to a status-derived error when the payload is not an envelope', () => {
    expect(toApiError(503, null).code).toBe('internal_error')
    expect(toApiError(404, undefined).code).toBe('not_found')
    expect(toApiError(404, 'plain text body').code).toBe('not_found')
    expect(toApiError(403, {}).code).toBe('forbidden')
    expect(toApiError(403, { error: null }).code).toBe('forbidden')
    expect(toApiError(403, { error: 'not an object' }).code).toBe('forbidden')
  })
})
