import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import {
  readInvitationShown,
  SCHEDULE_INVITATION_KEY,
} from '@/features/schedule/model/schedule-invitation'
import { useInvitationOnce } from '@/features/schedule/model/use-invitation-once'

afterEach(() => {
  window.sessionStorage.clear()
})

describe('the catalog is offered once per session, not once per view', () => {
  it('offers the catalog on the first empty schedule of a fresh session', () => {
    const { result } = renderHook(() => useInvitationOnce(true, 'month:0'))

    expect(result.current).toBe(false)
  })

  it('spends the offer as soon as it is actually made', () => {
    renderHook(() => useInvitationOnce(true, 'month:0'))

    expect(readInvitationShown()).toBe(true)
  })

  it('leaves the offer unspent while the schedule has events to show', () => {
    renderHook(() => useInvitationOnce(false, 'month:0'))

    expect(readInvitationShown()).toBe(false)
  })

  it('withdraws the offer when the very same mount switches to another period', () => {
    const { result, rerender } = renderHook(
      ({ key }: { key: string }) => useInvitationOnce(true, key),
      { initialProps: { key: 'month:0' } },
    )

    expect(result.current).toBe(false)

    rerender({ key: 'quarter:0' })

    expect(result.current).toBe(true)
  })

  it('keeps the offer standing while the same period merely re-renders', () => {
    const { result, rerender } = renderHook(
      ({ key }: { key: string }) => useInvitationOnce(true, key),
      { initialProps: { key: 'month:0' } },
    )

    rerender({ key: 'month:0' })

    expect(result.current).toBe(false)
  })

  it('reports the offer spent for every later mount of the same session', () => {
    renderHook(() => useInvitationOnce(true, 'month:0'))
    const { result } = renderHook(() => useInvitationOnce(true, 'month:0'))

    expect(result.current).toBe(true)
  })

  it('survives a reload within the session by reading what the session stored', () => {
    window.sessionStorage.setItem(SCHEDULE_INVITATION_KEY, '1')

    const { result } = renderHook(() => useInvitationOnce(true, 'month:0'))

    expect(result.current).toBe(true)
  })
})
