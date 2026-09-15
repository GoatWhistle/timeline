import { describe, expect, it } from 'vitest'
import { activeUserFilters, USER_DEFAULTS, userListParams } from '@/features/user-list/user.params'

function filters(overrides: Partial<typeof USER_DEFAULTS> = {}) {
  return { ...USER_DEFAULTS, ...overrides }
}

describe('the user directory asks the server for what the toolbar shows', () => {
  it('sends the sort the user picked, so the order covers the whole directory', () => {
    const params = userListParams(filters(), '', 'email', 'desc', 1)

    expect(params.sort).toBe('email')
    expect(params.order).toBe('desc')
  })

  it('separates an unset filter from an explicit false, which mean opposite things', () => {
    const unset = userListParams(filters(), '', 'name', 'asc', 1)
    expect(unset.admin).toBeUndefined()
    expect(unset.active).toBeUndefined()
    expect(unset.telegram).toBeUndefined()

    const explicit = userListParams(
      filters({ admin: 'false', active: 'false', telegram: 'false' }),
      '',
      'name',
      'asc',
      1,
    )
    expect(explicit.admin).toBe(false)
    expect(explicit.active).toBe(false)
    expect(explicit.telegram).toBe(false)
  })

  it('carries every filter the directory endpoint understands', () => {
    const params = userListParams(
      filters({ admin: 'true', active: 'true', telegram: 'true' }),
      'ivan',
      'created_at',
      'desc',
      2,
    )

    expect(params.admin).toBe(true)
    expect(params.active).toBe(true)
    expect(params.telegram).toBe(true)
    expect(params.query).toBe('ivan')
    expect(params.page).toBe(2)
  })

  it('omits an empty search rather than sending a blank string', () => {
    expect(userListParams(filters(), '', 'name', 'asc', 1).query).toBeUndefined()
  })

  it('counts the filters in play, which is what the button badge shows', () => {
    expect(activeUserFilters(filters())).toBe(0)
    expect(activeUserFilters(filters({ admin: 'true' }))).toBe(1)
    expect(activeUserFilters(filters({ admin: 'true', active: 'false' }))).toBe(2)
    expect(activeUserFilters(filters({ admin: 'true', active: 'false', telegram: 'true' }))).toBe(3)
  })
})
