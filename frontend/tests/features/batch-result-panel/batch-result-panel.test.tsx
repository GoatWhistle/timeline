import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it, vi } from 'vitest'
import {
  BatchResultPanel,
  failedKeys,
  rowStatus,
} from '@/features/batch-result-panel/batch-result-panel'
import type { BatchItemResult, BatchResult } from '@/shared/api/types.gen'

const result: BatchResult = {
  succeeded: 1,
  skipped: 1,
  failed: 2,
  results: [
    { index: 0, key: 'p1', status: 'ok', id: 's1' },
    { index: 1, key: 'p2', status: 'skipped', code: 'conflict', message: 'already set' },
    { index: 2, key: 'p3', status: 'error', code: 'not_found', message: 'status not found' },
    { index: 3, key: 'p4', status: 'error', code: 'internal_error', message: 'internal error' },
  ],
}

describe('rowStatus', () => {
  it('keeps the three contract statuses apart', () => {
    expect(rowStatus({ index: 0, status: 'ok' })).toBe('ok')
    expect(rowStatus({ index: 1, status: 'skipped' })).toBe('skipped')
    expect(rowStatus({ index: 2, status: 'error' })).toBe('error')
  })

  it('treats an unknown status as a failure rather than a success', () => {
    expect(rowStatus({ index: 3 } as BatchItemResult)).toBe('error')
  })
})

describe('failedKeys', () => {
  it('collects only the failed rows, leaving skipped ones alone', () => {
    expect(failedKeys(result)).toEqual(['p3', 'p4'])
  })

  it('returns nothing when every row succeeded', () => {
    expect(
      failedKeys({
        succeeded: 1,
        skipped: 0,
        failed: 0,
        results: [{ index: 0, key: 'p1', status: 'ok' }],
      }),
    ).toEqual([])
  })
})

describe('BatchResultPanel', () => {
  it('lists one line per row of the batch', () => {
    renderWithProviders(<BatchResultPanel result={result} />)
    expect(screen.getAllByRole('listitem')).toHaveLength(4)
  })

  it('shows the reason a row did not succeed', () => {
    renderWithProviders(<BatchResultPanel result={result} />)
    expect(screen.getByText('status not found')).toBeInTheDocument()
    expect(screen.getByText('already set')).toBeInTheDocument()
  })

  it('retries exactly the failed rows', async () => {
    const onRetryFailed = vi.fn()
    const { user } = renderWithProviders(
      <BatchResultPanel result={result} onRetryFailed={onRetryFailed} />,
    )

    await user.click(screen.getByRole('button'))
    expect(onRetryFailed).toHaveBeenCalledWith(['p3', 'p4'])
  })

  it('offers no retry when nothing failed', () => {
    renderWithProviders(
      <BatchResultPanel
        result={{
          succeeded: 1,
          skipped: 0,
          failed: 0,
          results: [{ index: 0, key: 'p1', status: 'ok' }],
        }}
        onRetryFailed={vi.fn()}
      />,
    )
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('uses the supplied label for a row instead of the raw identifier', () => {
    renderWithProviders(
      <BatchResultPanel result={result} labelFor={(item) => `User ${item.key}`} />,
    )
    expect(screen.getByText('User p3')).toBeInTheDocument()
  })
})
