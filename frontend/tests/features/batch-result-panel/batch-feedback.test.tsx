import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it } from 'vitest'
import { BatchResultPanel } from '@/features/batch-result-panel/batch-result-panel'
import type { BatchResult } from '@/shared/api/types.gen'

const RESULT: BatchResult = {
  succeeded: 1,
  skipped: 0,
  failed: 1,
  results: [
    { index: 0, key: 'a', status: 'ok' },
    { index: 1, key: 'b', status: 'error', code: 'conflict', message: 'already assigned' },
  ],
}

describe('the batch result announces itself', () => {
  it('is a polite live region so the outcome is not silent', () => {
    renderWithProviders(<BatchResultPanel result={RESULT} />)

    const panel = screen.getByRole('status')
    expect(panel).toHaveAttribute('aria-live', 'polite')
    expect(panel).toHaveTextContent(/1/)
  })

  it('enters with a duration and an easing from the motion scale', () => {
    renderWithProviders(<BatchResultPanel result={RESULT} />)

    const panel = screen.getByRole('status')
    expect(panel.className).toContain('motion-safe:animate-in')
    expect(panel.className).toMatch(/motion-safe:duration-\w/)
    expect(panel.className).toMatch(/motion-safe:ease-\w/)
  })

  it('marks the retry button busy instead of only dimming it', () => {
    renderWithProviders(
      <BatchResultPanel result={RESULT} onRetryFailed={() => undefined} isRetrying />,
    )

    const retry = screen.getByRole('button', { name: /retry/i })
    expect(retry).toHaveAttribute('aria-busy', 'true')
    expect(retry).toBeDisabled()
  })

  it('leaves the retry button unmarked when it is idle', () => {
    renderWithProviders(<BatchResultPanel result={RESULT} onRetryFailed={() => undefined} />)

    const retry = screen.getByRole('button', { name: /retry/i })
    expect(retry).not.toHaveAttribute('aria-busy')
    expect(retry).toBeEnabled()
  })
})
