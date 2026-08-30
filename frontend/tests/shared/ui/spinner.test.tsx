import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it } from 'vitest'
import { Spinner } from '@/shared/ui/data-display/spinner'

function icon(container: HTMLElement): HTMLElement {
  const found = container.querySelector<HTMLElement>('[data-busy-spin]')
  if (!found) throw new Error('the spinner rendered no busy indicator')
  return found
}

describe('the busy indicator survives reduced motion', () => {
  it('carries the hook the reduced-motion rule targets', () => {
    const { container } = renderWithProviders(<Spinner />)

    expect(icon(container)).toBeInTheDocument()
  })

  it('turns at a constant rate rather than easing', () => {
    const { container } = renderWithProviders(<Spinner />)

    const classes = icon(container).getAttribute('class') ?? ''
    expect(classes).toContain('animate-spin')
    expect(classes).toContain('ease-linear')
  })

  it('says it is busy in words, not only by turning', () => {
    renderWithProviders(<Spinner />)

    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-live', 'polite')
    expect(status.textContent?.trim()).not.toBe('')
  })

  it('lets the caller name the operation being waited on', () => {
    renderWithProviders(<Spinner label="Marking the registration" />)

    expect(screen.getByRole('status')).toHaveTextContent('Marking the registration')
  })
})
