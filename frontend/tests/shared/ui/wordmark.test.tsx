import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Wordmark } from '@/shared/ui/brand/wordmark'

function prefersReducedMotion(reduce: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('reduce') ? reduce : false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
      onchange: null,
    })),
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('the wordmark leads to the schedule', () => {
  it('is a link, so the destination is visible before the click', () => {
    renderWithProviders(<Wordmark />)
    expect(screen.getByRole('link')).toHaveAttribute('href', '/schedule')
  })

  it('plays the mark animation before it navigates', async () => {
    prefersReducedMotion(false)
    const { user } = renderWithProviders(<Wordmark />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('data-travelling', 'false')

    await user.click(link)
    await waitFor(() => expect(link).toHaveAttribute('data-travelling', 'true'))
  })

  it('skips the wait when the visitor asked for less motion', async () => {
    prefersReducedMotion(true)
    const { user } = renderWithProviders(<Wordmark />)
    const link = screen.getByRole('link')

    await user.click(link)
    expect(link).toHaveAttribute('data-travelling', 'false')
  })

  it('leaves a modified click to the browser, so it can open a new tab', async () => {
    prefersReducedMotion(false)
    const { user } = renderWithProviders(<Wordmark />)
    const link = screen.getByRole('link')

    await user.keyboard('[ControlLeft>]')
    await user.click(link)
    await user.keyboard('[/ControlLeft]')

    expect(link).toHaveAttribute('data-travelling', 'false')
  })
})
