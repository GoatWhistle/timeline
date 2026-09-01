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
})

describe('the wordmark inside the application', () => {
  it('is a link, so the destination is visible before the click', () => {
    renderWithProviders(<Wordmark to="/schedule" />)
    expect(screen.getByRole('link')).toHaveAttribute('href', '/schedule')
  })

  it('plays the mark animation before it navigates', async () => {
    prefersReducedMotion(false)
    const { user } = renderWithProviders(<Wordmark to="/schedule" />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('data-travelling', 'false')

    await user.click(link)
    await waitFor(() => expect(link).toHaveAttribute('data-travelling', 'true'))
  })

  it('skips the wait when the visitor asked for less motion', async () => {
    prefersReducedMotion(true)
    const { user } = renderWithProviders(<Wordmark to="/schedule" />)
    const link = screen.getByRole('link')

    await user.click(link)
    expect(link).toHaveAttribute('data-travelling', 'false')
  })

  it('leaves a modified click to the browser, so it can open a new tab', async () => {
    prefersReducedMotion(false)
    const { user } = renderWithProviders(<Wordmark to="/schedule" />)
    const link = screen.getByRole('link')

    await user.keyboard('[ControlLeft>]')
    await user.click(link)
    await user.keyboard('[/ControlLeft]')

    expect(link).toHaveAttribute('data-travelling', 'false')
  })
})

describe('the wordmark on the sign-in and sign-up screens', () => {
  it('is not a link: there is nowhere to go before you are signed in', () => {
    renderWithProviders(<Wordmark />)
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('still answers a press with the mark animation', async () => {
    prefersReducedMotion(false)
    const { container } = renderWithProviders(<Wordmark />)
    const mark = container.querySelector('[data-travelling]') as HTMLElement
    expect(mark).toHaveAttribute('data-travelling', 'false')

    mark.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    await waitFor(() => expect(mark).toHaveAttribute('data-travelling', 'true'))
  })
})
