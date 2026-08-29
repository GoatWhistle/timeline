import { toast } from 'sonner'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { reportBatchResult } from '@/shared/api/batch-result/batch-result'
import type { BatchResult } from '@/shared/api/types.gen'

type BatchResultItem = NonNullable<BatchResult['results']>[number]

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}))

function item(overrides: Partial<BatchResultItem> = {}): BatchResultItem {
  return { index: 0, status: 'ok', ...overrides }
}

function result(overrides: Partial<BatchResult> = {}): BatchResult {
  return { succeeded: 0, skipped: 0, failed: 0, results: [], ...overrides }
}

beforeEach(() => {
  vi.mocked(toast.success).mockClear()
  vi.mocked(toast.error).mockClear()
  vi.mocked(toast.warning).mockClear()
})

describe('reportBatchResult', () => {
  it('reports success only when nothing failed and nothing was skipped', () => {
    reportBatchResult(
      result({ succeeded: 3, results: [item(), item(), item()] }),
      'Participants added',
    )
    expect(toast.success).toHaveBeenCalledTimes(1)
    expect(toast.error).not.toHaveBeenCalled()
    expect(toast.warning).not.toHaveBeenCalled()
    expect(vi.mocked(toast.success).mock.calls[0]?.[0]).toBe('Participants added')
  })

  it('warns rather than succeeds when rows were skipped', () => {
    reportBatchResult(
      result({ succeeded: 2, skipped: 1, results: [item(), item(), item({ status: 'skipped' })] }),
      'Participants added',
    )
    expect(toast.success).not.toHaveBeenCalled()
    expect(toast.warning).toHaveBeenCalledTimes(1)
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('escalates to an error toast as soon as one row failed', () => {
    reportBatchResult(
      result({
        succeeded: 1,
        failed: 1,
        results: [item(), item({ status: 'error', code: 'not_found', message: 'no such user' })],
      }),
      'Participants added',
    )
    expect(toast.error).toHaveBeenCalledTimes(1)
    expect(toast.warning).not.toHaveBeenCalled()
    expect(toast.success).not.toHaveBeenCalled()
  })

  it('prefers an error toast over a warning when rows both failed and were skipped', () => {
    reportBatchResult(
      result({
        succeeded: 1,
        skipped: 1,
        failed: 1,
        results: [item(), item({ status: 'skipped' }), item({ status: 'error', code: 'conflict' })],
      }),
      'Participants added',
    )
    expect(toast.error).toHaveBeenCalledTimes(1)
    expect(toast.warning).not.toHaveBeenCalled()
  })

  it('lists the message of each problem row in the description', () => {
    reportBatchResult(
      result({
        failed: 2,
        results: [
          item({ status: 'error', message: 'first problem' }),
          item({ status: 'error', message: 'second problem' }),
        ],
      }),
      'Participants added',
    )
    const [, options] = vi.mocked(toast.error).mock.calls[0] as [string, { description: string }]
    expect(options.description).toContain('first problem')
    expect(options.description).toContain('second problem')
  })

  it('falls back to the machine code when a failed row carries no message', () => {
    reportBatchResult(
      result({ failed: 1, results: [item({ status: 'error', code: 'rate_limited' })] }),
      'Participants added',
    )
    const [, options] = vi.mocked(toast.error).mock.calls[0] as [string, { description: string }]
    expect(options.description).toContain('rate_limited')
  })

  it('caps the listed problems at five so one bad batch cannot flood the toast', () => {
    const rows = Array.from({ length: 9 }, (_, i) =>
      item({ index: i, status: 'error', message: `problem-${i}` }),
    )
    reportBatchResult(result({ failed: 9, results: rows }), 'Participants added')
    const [, options] = vi.mocked(toast.error).mock.calls[0] as [string, { description: string }]
    expect(options.description).toContain('problem-4')
    expect(options.description).not.toContain('problem-5')
    expect(options.description).not.toContain('problem-8')
  })

  it('does not list rows that succeeded among the problems', () => {
    reportBatchResult(
      result({
        succeeded: 1,
        failed: 1,
        results: [
          item({ status: 'ok', message: 'quiet success' }),
          item({ status: 'error', message: 'loud failure' }),
        ],
      }),
      'Participants added',
    )
    const [, options] = vi.mocked(toast.error).mock.calls[0] as [string, { description: string }]
    expect(options.description).toContain('loud failure')
    expect(options.description).not.toContain('quiet success')
  })
})
