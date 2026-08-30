import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildBurning, DEFAULT_FILTERS } from '@/features/burning/model/burning'
import { BurningActions } from '@/features/burning/ui/burning-actions/burning-actions'
import { TooltipProvider } from '@/shared/ui/overlays/tooltip'
import { events, NOW } from './burning-fixtures'

function actionableItem() {
  const items = buildBurning(events(), DEFAULT_FILTERS, NOW)
  const found = items.find((item) => item.actionable)
  if (!found) throw new Error('the fixture produced no actionable row')
  return found
}

function renderActions() {
  return renderWithProviders(
    <TooltipProvider>
      <BurningActions item={actionableItem()} />
    </TooltipProvider>,
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('marking a registration answers the click', () => {
  it('shows a busy indicator while the request is in flight', async () => {
    let release: (() => void) | undefined
    const held = new Promise<void>((resolve) => {
      release = resolve
    })

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        await held
        return new Response(JSON.stringify({ status: 'DONE' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      }),
    )

    const { user } = renderActions()
    const button = screen.getByRole('button', { name: /mark/i })

    expect(button).not.toHaveAttribute('aria-busy')

    await user.click(button)

    await waitFor(() => {
      expect(button).toHaveAttribute('aria-busy', 'true')
    })
    expect(button).toBeDisabled()
    expect(screen.getByRole('status')).toBeInTheDocument()

    release?.()
  })

  it('names the busy state for a screen reader in the active language', async () => {
    let release: (() => void) | undefined
    const held = new Promise<void>((resolve) => {
      release = resolve
    })

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        await held
        return new Response(JSON.stringify({ status: 'DONE' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      }),
    )

    const { user } = renderActions()
    await user.click(screen.getByRole('button', { name: /mark/i }))

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(/marking the registration/i)
    })

    release?.()
  })
})
