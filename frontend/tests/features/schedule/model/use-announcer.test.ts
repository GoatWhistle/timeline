import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ANNOUNCE_DELAY } from '@/features/schedule/model/schedule-scale'
import { useAnnouncer } from '@/features/schedule/model/use-announcer'

describe('useAnnouncer', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('starts silent', () => {
    expect(renderHook(() => useAnnouncer()).result.current.message).toBe('')
  })

  it('waits 150 ms before announcing', () => {
    const { result } = renderHook(() => useAnnouncer())

    act(() => result.current.announce('first'))
    act(() => {
      vi.advanceTimersByTime(ANNOUNCE_DELAY - 1)
    })
    expect(result.current.message).toBe('')

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(result.current.message).toBe('first')
  })

  it('announces only the last of a burst, so holding an arrow key queues nothing', () => {
    const { result } = renderHook(() => useAnnouncer())

    for (const value of ['a', 'b', 'c', 'd']) {
      act(() => result.current.announce(value))
      act(() => {
        vi.advanceTimersByTime(20)
      })
    }
    expect(result.current.message).toBe('')

    act(() => {
      vi.advanceTimersByTime(ANNOUNCE_DELAY)
    })
    expect(result.current.message).toBe('d')
  })

  it('uses 150 ms as the delay', () => {
    expect(ANNOUNCE_DELAY).toBe(150)
  })

  it('drops a pending announcement on unmount', () => {
    const { result, unmount } = renderHook(() => useAnnouncer())
    act(() => result.current.announce('gone'))
    unmount()
    expect(() => vi.advanceTimersByTime(ANNOUNCE_DELAY * 2)).not.toThrow()
  })
})
