import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it, vi } from 'vitest'
import { EMPTY_CIVIL } from '@/shared/datetime/civil'
import { MomentRangeFields } from '@/shared/ui/forms/calendar/moment-range'

const EMPTY = { start: EMPTY_CIVIL, end: EMPTY_CIVIL }

function renderRange() {
  return renderWithProviders(<MomentRangeFields idPrefix="ev" value={EMPTY} onChange={vi.fn()} />)
}

describe('the two moments of a period announce that they are required', () => {
  it('marks the date box of both the start and the end', () => {
    const { container } = renderRange()
    expect(container.querySelector('#ev-start')?.getAttribute('aria-required')).toBe('true')
    expect(container.querySelector('#ev-end')?.getAttribute('aria-required')).toBe('true')
  })

  it('marks the time box of both the start and the end', () => {
    const { container } = renderRange()
    expect(container.querySelector('#ev-start-time')?.getAttribute('aria-required')).toBe('true')
    expect(container.querySelector('#ev-end-time')?.getAttribute('aria-required')).toBe('true')
  })

  it('shows a visible mark beside each of the two labels', () => {
    const { container } = renderRange()
    expect(container.querySelectorAll('[data-required-mark]')).toHaveLength(2)
  })
})
