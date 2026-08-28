import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  UNDO_WINDOW_MS,
  useUndoableAction,
} from '@/shared/hooks/use-undoable-action/use-undoable-action'

const action = vi.hoisted(() => ({ current: undefined as undefined | (() => void) }))

vi.mock('sonner', () => ({
  toast: Object.assign(
    (_message: string, options?: { action?: { onClick: () => void } }) => {
      action.current = options?.action?.onClick
      return 'toast-id'
    },
    { dismiss: vi.fn() },
  ),
}))

describe('useUndoableAction', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    action.current = undefined
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('defers the action until the undo window has passed', () => {
    const run = vi.fn()
    const { result } = renderHook(() => useUndoableAction())

    act(() => {
      result.current({ key: 'remove', message: 'Removing', run })
    })
    expect(run).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(UNDO_WINDOW_MS - 1)
    })
    expect(run).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('never runs the action when undo is pressed inside the window', () => {
    const run = vi.fn()
    const onUndo = vi.fn()
    const { result } = renderHook(() => useUndoableAction())

    act(() => {
      result.current({ key: 'remove', message: 'Removing', run, onUndo })
    })
    act(() => {
      action.current?.()
    })
    act(() => {
      vi.advanceTimersByTime(UNDO_WINDOW_MS * 2)
    })

    expect(run).not.toHaveBeenCalled()
    expect(onUndo).toHaveBeenCalledTimes(1)
  })

  it('runs the action once when undo arrives after the window closed', () => {
    const run = vi.fn()
    const onUndo = vi.fn()
    const { result } = renderHook(() => useUndoableAction())

    act(() => {
      result.current({ key: 'remove', message: 'Removing', run, onUndo })
    })
    act(() => {
      vi.advanceTimersByTime(UNDO_WINDOW_MS)
    })
    act(() => {
      action.current?.()
    })

    expect(run).toHaveBeenCalledTimes(1)
    expect(onUndo).not.toHaveBeenCalled()
  })

  it('replaces a pending action when the same key is scheduled again', () => {
    const first = vi.fn()
    const second = vi.fn()
    const { result } = renderHook(() => useUndoableAction())

    act(() => {
      result.current({ key: 'remove', message: 'Removing', run: first })
    })
    act(() => {
      result.current({ key: 'remove', message: 'Removing', run: second })
    })
    act(() => {
      vi.advanceTimersByTime(UNDO_WINDOW_MS)
    })

    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
  })

  it('keeps actions under different keys independent', () => {
    const a = vi.fn()
    const b = vi.fn()
    const { result } = renderHook(() => useUndoableAction())

    act(() => {
      result.current({ key: 'a', message: 'A', run: a })
    })
    act(() => {
      result.current({ key: 'b', message: 'B', run: b })
    })
    act(() => {
      vi.advanceTimersByTime(UNDO_WINDOW_MS)
    })

    expect(a).toHaveBeenCalledTimes(1)
    expect(b).toHaveBeenCalledTimes(1)
  })

  it('drops pending actions when the component unmounts', () => {
    const run = vi.fn()
    const { result, unmount } = renderHook(() => useUndoableAction())

    act(() => {
      result.current({ key: 'remove', message: 'Removing', run })
    })
    unmount()
    act(() => {
      vi.advanceTimersByTime(UNDO_WINDOW_MS * 2)
    })

    expect(run).not.toHaveBeenCalled()
  })
})
