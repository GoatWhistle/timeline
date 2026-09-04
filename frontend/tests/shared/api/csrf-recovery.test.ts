import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const CLIENT = join(process.cwd(), 'src/shared/api/client.ts')

describe('a rotated CSRF token does not strand the user on a dead button', () => {
  const source = readFileSync(CLIENT, 'utf8')

  it('treats a forbidden response as recoverable, not only an unauthorised one', () => {
    expect(source).toContain('CSRF_STATUS')
    expect(source).toMatch(/response\.status === CSRF_STATUS/)
  })

  it('fetches a fresh token before replaying the rejected request', () => {
    const block = source.slice(source.indexOf('async function recoverFromCsrf'))
    expect(block).toContain('resetCsrfToken()')
    expect(block).toContain('currentCsrfToken()')
  })

  it('replays the request only once so a genuine forbidden still surfaces', () => {
    const block = source.slice(source.indexOf('async function recoverFromCsrf'))
    expect(block).toContain('csrfRetried')
  })

  it('never tries to recover a request that carried no CSRF token to begin with', () => {
    expect(source).toMatch(/MUTATING\.has\([a-zA-Z]+\.method\)/)
  })
})
