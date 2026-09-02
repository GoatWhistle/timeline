import { describe, expect, it } from 'vitest'
import {
  ABSENT,
  asAbsence,
  isAbsence,
  personalError,
  presentAbsence,
  UNREADABLE,
} from '@/entities/personal/personal-absence'
import { ApiError } from '@/shared/api/errors'

describe('a foreign personal record is an absence, never a refusal', () => {
  it('reads 404 as absence', () => {
    expect(isAbsence(new ApiError(404, { code: 'not_found' }))).toBe(true)
    expect(presentAbsence(new ApiError(404, { code: 'not_found' }))).toBe(ABSENT)
  })

  it('turns a 403 into a 404 so no refusal ever reaches the screen', () => {
    const rewritten = personalError(new ApiError(403, { code: 'forbidden' }))

    expect(rewritten.status).toBe(404)
    expect(rewritten.code).toBe('not_found')
    expect(rewritten.code).not.toBe('forbidden')
    expect(isAbsence(rewritten)).toBe(true)
  })

  it('leaves a real failure alone rather than disguising it as an absence', () => {
    const server = new ApiError(503, { code: 'internal_error' })

    expect(personalError(server)).toBe(server)
    expect(isAbsence(server)).toBe(false)
    expect(presentAbsence(server)).toBe(UNREADABLE)
  })

  it('does not treat a validation failure as an absence', () => {
    expect(isAbsence(new ApiError(400, { code: 'validation_failed' }))).toBe(false)
    expect(isAbsence(new ApiError(429, { code: 'rate_limited' }))).toBe(false)
  })

  it('substitutes the empty value for an absence and rethrows anything else', () => {
    expect(asAbsence(new ApiError(404, { code: 'not_found' }), [])).toEqual([])
    expect(asAbsence(new ApiError(404, { code: 'not_found' }), null)).toBeNull()
    expect(() => asAbsence(new ApiError(503, { code: 'internal_error' }), [])).toThrow(ApiError)
  })

  it('treats a non-api failure as unreadable rather than as an absence', () => {
    expect(isAbsence(new Error('network down'))).toBe(false)
    expect(personalError(new Error('network down')).status).toBe(503)
  })
})
